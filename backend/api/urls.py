from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.views import (
    AdminBriefViewSet,
    AdminProjectViewSet,
    AdminUserViewSet,
    AppointmentViewSet,
    AssetViewSet,
    AvailabilityOverrideViewSet,
    AvailabilityRuleViewSet,
    AvailabilityView,
    ClientProjectViewSet,
    ConversationViewSet,
    CsrfView,
    HealthView,
    InvitationAcceptView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PublicAppointmentCreateView,
    PublicBriefCreateView,
    SessionView,
    ProfileView,
    GuestAppointmentView,
)

from api.uploads import AssetPrepareView, AssetFinalizeView, AssetReleaseView
from communications.microsoft_authorization import authorization_callback
from api.confirmations import SubmissionConfirmationView
from api.analytics import AnalyticsConfigView, BusinessInsightsView
from api.analytics_preferences import AnalyticsPreferenceView

router = DefaultRouter()
router.register("projects", ClientProjectViewSet, basename="projects")
router.register("appointments", AppointmentViewSet, basename="appointments")
router.register("conversations", ConversationViewSet, basename="conversations")
router.register("assets", AssetViewSet, basename="assets")
router.register("admin/briefs", AdminBriefViewSet, basename="admin-briefs")
router.register("admin/projects", AdminProjectViewSet, basename="admin-projects")
router.register("admin/users", AdminUserViewSet, basename="admin-users")
router.register("admin/availability-rules", AvailabilityRuleViewSet, basename="availability-rules")
router.register("admin/availability-overrides", AvailabilityOverrideViewSet, basename="availability-overrides")

urlpatterns = [
    path("public/analytics-config/", AnalyticsConfigView.as_view()),
    path("public/analytics-preference/", AnalyticsPreferenceView.as_view()),
    path("admin/insights/", BusinessInsightsView.as_view()),
    path("email/microsoft/callback/", authorization_callback),
    path("health/", HealthView.as_view()),
    path("auth/csrf/", CsrfView.as_view()),
    path("auth/profile/", ProfileView.as_view()),
    path("auth/session/", SessionView.as_view()),
    path("auth/password-reset/", PasswordResetRequestView.as_view()),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view()),
    path("auth/invitations/accept/", InvitationAcceptView.as_view()),
    path("public/briefs/", PublicBriefCreateView.as_view()),
    path("public/availability/", AvailabilityView.as_view()),
    path("public/appointments/", PublicAppointmentCreateView.as_view()),
    path("public/confirm/", SubmissionConfirmationView.as_view()),
    path("public/appointments/<uuid:pk>/manage/", GuestAppointmentView.as_view()),
    path("assets/<uuid:pk>/release/", AssetReleaseView.as_view()),
    path("assets/prepare/", AssetPrepareView.as_view()),
    path("assets/<uuid:pk>/finalize/", AssetFinalizeView.as_view()),
    path("", include(router.urls)),
]
