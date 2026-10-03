"""GA4 configuration, allowlisted lead measurements, and first-party business insights.

Google receives no contact fields, free text, record IDs, or capability URLs.
Browser/session identifiers are used only for an immediate, consented conversion;
they are never saved on a lead or retried after the request has finished.
"""
from collections import Counter
from datetime import timedelta
import logging
import re

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import IsAdminRole
from intakes.models import ProjectBrief
from projects.models import Project
from scheduling.models import Appointment

BUSINESS_TYPES = ["professional_services", "home_services", "retail", "food_hospitality",
                  "beauty_wellness", "creative_media", "education", "nonprofit",
                  "technology", "other", "not_sure"]
SERVICE_INTERESTS = ["web-design", "full-stack-development", "api-integrations", "seo-aeo",
                     "ai-content-agents", "security", "launch-support", "not_sure"]
PACKAGES = {"Launch": "launch", "Business": "business", "Professional": "professional",
            "Custom": "custom", "I need a recommendation": "recommendation"}
GOALS = dict(zip(["Attract clients", "Take bookings", "Sell products", "Improve my website",
                 "Build an app", "Connect my tools", "Let’s figure it out"],
                ["attract_clients", "take_bookings", "sell_products", "improve_website",
                 "build_app", "connect_tools", "not_sure"]))
CONTENT = dict(zip(["My copy and images are ready", "Some materials are ready",
                   "I need help with copy or visuals", "I’m not sure yet"],
                  ["ready", "partial", "needs_help", "not_sure"]))
ACQUISITION_KEYS = ("campaign_source", "campaign_medium", "campaign_id", "campaign_content", "device_category")
logger = logging.getLogger(__name__)


def campaign_value(value):
    # Deliberately reject URLs, emails, long numeric identifiers and arbitrary prose.
    if isinstance(value, str) and re.fullmatch(r"[a-zA-Z][a-zA-Z0-9_-]{0,49}", value) and not re.search(r"\d{6}", value):
        return value.lower()
    return ""


def acquisition_context(raw):
    if not isinstance(raw, dict) or raw.get("consent") is not True:
        return {}
    result = {key: campaign_value(raw.get(key)) for key in ACQUISITION_KEYS}
    if result["device_category"] not in ["mobile", "tablet", "desktop"]:
        result["device_category"] = "unknown"
    return {key: value for key, value in result.items() if value}


def configured():
    return bool(re.fullmatch(r"G-[A-Z0-9]{6,20}", settings.GA_MEASUREMENT_ID))


def lead_properties(record, kind):
    properties = {"form_type": kind, **acquisition_context({"consent": True, **record.acquisition})}
    if kind == "brief":
        properties.update(
            business_type=record.business_type if record.business_type in BUSINESS_TYPES else "unspecified",
            service_interest=record.service_interest if record.service_interest in SERVICE_INTERESTS else "unspecified",
            package_tier=PACKAGES.get(record.package, "unspecified"),
            primary_goal=GOALS.get(record.goal, "unspecified"),
            content_readiness=CONTENT.get(record.content_readiness, "unspecified"),
            existing_website="yes" if record.domain else "no",
        )
        if record.launch_date:
            days = (record.launch_date - timezone.localdate()).days
            properties["launch_window"] = "within_month" if days <= 30 else "one_to_three_months" if days <= 90 else "later"
        else:
            properties["launch_window"] = "unspecified"
    return properties


def record_lead(record, kind, raw):
    """Called exactly once, only in the newly-created record's transaction.

Never retry an ambiguous Google response: GA4 doesn't promise deduplication for
generate_lead. The database remains the authoritative count if delivery fails.
"""
    if not configured() or not settings.GA_API_SECRET or not isinstance(raw, dict) or raw.get("consent") is not True:
        return
    client_id, session_id = str(raw.get("client_id", "")), str(raw.get("session_id", ""))
    if not re.fullmatch(r"\d{1,20}\.\d{1,20}", client_id) or not re.fullmatch(r"[1-9]\d{0,15}", session_id):
        return
    properties = {**lead_properties(record, kind), "session_id": int(session_id), "source_layer": "backend"}
    payload = {"client_id": client_id, "consent": {"ad_user_data": "DENIED", "ad_personalization": "DENIED"},
               "events": [{"name": "generate_lead", "params": properties}]}

    def deliver():
        try:
            response = requests.post("https://www.google-analytics.com/mp/collect",
                                     params={"measurement_id": settings.GA_MEASUREMENT_ID, "api_secret": settings.GA_API_SECRET},
                                     json=payload, timeout=(1, 2))
            if not 200 <= response.status_code < 300:
                logger.warning("GA4 lead delivery rejected (HTTP %s); business record is saved", response.status_code)
        except requests.RequestException:
            # Never log the exception: its URL contains the Measurement Protocol secret.
            logger.warning("GA4 lead delivery unavailable; business record is saved")
    transaction.on_commit(deliver, robust=True)


class AnalyticsConfigView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"measurement_id": settings.GA_MEASUREMENT_ID if configured() else "",
                         "server_conversions": configured() and bool(settings.GA_API_SECRET)})


class BusinessInsightsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 90))
        except (ValueError, TypeError):
            days = 90
        days = days if days in [30, 90, 365] else 90
        since = timezone.now() - timedelta(days=days)
        briefs = list(ProjectBrief.objects.filter(deleted_at__isnull=True, created_at__gte=since)
                      .only("id", "created_at", "email_verified_at", "status", "business_type", "service_interest",
                            "package", "goal", "content_readiness", "acquisition"))
        appointments = Appointment.objects.filter(deleted_at__isnull=True, created_at__gte=since)
        projects = Project.objects.filter(deleted_at__isnull=True, brief_id__in=[b.pk for b in briefs])
        project_briefs = set(projects.values_list("brief_id", flat=True))

        def breakdown(get_key):
            counts, converted = Counter(), Counter()
            for brief in briefs:
                key = get_key(brief) or "unspecified"
                counts[key] += 1
                if brief.pk in project_briefs:
                    converted[key] += 1
            return [{"value": value, "leads": count, "projects": converted[value],
                     "project_rate": round(converted[value] / count * 100, 1)}
                    for value, count in counts.most_common()]

        weekly = Counter(b.created_at.date().isoformat() for b in briefs)
        return Response({
            "days": days, "generated_at": timezone.now(), "source": "business_database",
            "totals": {"briefs": len(briefs), "confirmed_briefs": sum(bool(b.email_verified_at) for b in briefs),
                       "projects": len(project_briefs), "launched_projects": projects.filter(status="launched").count(),
                       "booking_requests": appointments.count(),
                       "confirmed_bookings": appointments.filter(email_verified_at__isnull=False).count(),
                       "completed_consultations": appointments.filter(status="completed").count(),
                       "cancelled_bookings": appointments.filter(status="cancelled").count()},
            "breakdowns": {
                "business_type": breakdown(lambda b: b.business_type),
                "service_interest": breakdown(lambda b: b.service_interest),
                "package_tier": breakdown(lambda b: PACKAGES.get(b.package)),
                "primary_goal": breakdown(lambda b: GOALS.get(b.goal)),
                "content_readiness": breakdown(lambda b: CONTENT.get(b.content_readiness)),
                "campaign_source": breakdown(lambda b: acquisition_context({"consent": True, **b.acquisition}).get("campaign_source")),
                "campaign_id": breakdown(lambda b: acquisition_context({"consent": True, **b.acquisition}).get("campaign_id")),
                "device_category": breakdown(lambda b: b.acquisition.get("device_category")),
            },
            "daily_briefs": [{"date": day, "leads": count} for day, count in sorted(weekly.items())],
            "tracking": {"configured": configured(), "server_conversions": configured() and bool(settings.GA_API_SECRET),
                         "property_id": settings.GA_PROPERTY_ID, "measurement_id": settings.GA_MEASUREMENT_ID if configured() else ""},
        })
