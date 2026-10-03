import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Check, Download } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { today } from "@internationalized/date";
import {
  useLeadContact,
  validContactEmail,
} from "../components/LeadContactContext";
import { Field, Notice } from "../components/Controls";
import { API_BASE, apiRequest } from "../api";
import consultingMeeting from "../../assets/websites/consulting_meeting.webp";
import ConsultationDatePicker from "../components/ConsultationDatePicker";
import Reveal from "../Reveal";
import {
  CONSULTATION_TIME_ZONE,
  CONSULTATION_TIME_LABEL,
  consultationDate,
  formatConsultation,
} from "../content/scheduling";
import "./BookingPage.css";
export function SlotPicker({ value, onChange, refresh = 0 }) {
  const [date, setDate] = useState("");
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest(
      `/public/availability/?start=${today(CONSULTATION_TIME_ZONE)}&days=60`,
    )
      .then((data) => {
        if (active) setDays(data);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setDays([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh, retry]);
  const grouped = useMemo(() => {
    const result = {};
    for (const slot of days.flatMap((day) => day.slots)) {
      const day = consultationDate(slot);
      (result[day] ||= []).push(slot);
    }
    return result;
  }, [days]);
  return (
    <div className="slot-picker">
      <div className="booking-heading">
        <span className="booking-heading-icon">
          <CalendarDays size={21} />
        </span>
        <div>
          <h3>Choose a date and time</h3>
          <p>30-minute consultation · Free</p>
          <p className="booking-timezone">
            All times are in {CONSULTATION_TIME_LABEL}.
          </p>
        </div>
      </div>
      <ConsultationDatePicker
        disabled={loading || !!error}
        value={date}
        onChange={(v) => {
          setDate(v);
          onChange("");
        }}
        min={today(CONSULTATION_TIME_ZONE).toString()}
        max={today(CONSULTATION_TIME_ZONE).add({ days: 59 }).toString()}
        isDateUnavailable={(day) => !grouped[day.toString()]?.length}
      />
      {loading && (
        <p className="form-help" role="status">
          Checking availability…
        </p>
      )}
      {error && (
        <div className="availability-error">
          <p className="form-help" role="status">
            The calendar is temporarily unavailable. Please try again shortly.
          </p>
          <button
            className="text-link"
            type="button"
            onClick={() => setRetry((n) => n + 1)}
          >
            Try again
          </button>
          <p className="form-help">
            You can also{" "}
            <a href="mailto:letsbuild@marcdbycartez.com">
              email me to arrange a call
            </a>
            .
          </p>
        </div>
      )}
      {!loading && !error && !Object.keys(grouped).length && (
        <p className="form-help">
          There are no open times right now.{" "}
          <a href="mailto:letsbuild@marcdbycartez.com">Email me</a> and we’ll
          find a time together.
        </p>
      )}
      <fieldset className="time-slots">
        <legend>
          {date
            ? `Available times · ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}`
            : "Available times"}
        </legend>
        {date ? (
          (grouped[date] || []).map((slot) => (
            <label
              key={slot}
              className={value === slot ? "time-slot is-selected" : "time-slot"}
            >
              <input
                type="radio"
                name="consultation-time"
                value={slot}
                checked={value === slot}
                onChange={() => onChange(slot)}
              />
              <Check className="time-slot-check" size={13} aria-hidden="true" />
              {new Intl.DateTimeFormat("en-US", {
                timeZone: CONSULTATION_TIME_ZONE,
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(slot))}
            </label>
          ))
        ) : (
          <p className="form-help">Choose an available date to see times.</p>
        )}
      </fieldset>
      <div
        className="booking-selection-feedback"
        role="status"
        aria-live="polite"
      >
        {value && (
          <p key={value}>
            <Check size={16} aria-hidden="true" />
            <span>
              <strong>Your time is selected.</strong>{" "}
              {formatConsultation(value)}. Complete your details below to
              request it.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
export default function BookingPage() {
  const { contact: form, updateContact: change } = useLeadContact();
  const [slot, setSlot] = useState("");
  const [attempted, setAttempted] = useState(false);
  const validationSummary = useRef(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);
  const [token, setToken] = useState("");
  const [refresh, setRefresh] = useState(0);
  const key = useRef("");
  const challenge = useRef(null);
  const requiredErrors = {
    ...(!slot && { slot: "Choose an available date and time." }),
    ...(!form.first_name.trim() && { first_name: "Enter your first name." }),
    ...(!form.last_name.trim() && { last_name: "Enter your last name." }),
    ...(!validContactEmail(form.email) && {
      email: "Enter a valid email address.",
    }),
    ...(import.meta.env.VITE_TURNSTILE_SITE_KEY &&
      !token && {
        verification:
          "Complete the security check before requesting your call.",
      }),
  };
  const ready = Object.keys(requiredErrors).length === 0;
  const submit = async (e) => {
    e.preventDefault();
    if (working) return;
    setAttempted(true);
    if (!ready) {
      requestAnimationFrame(() => validationSummary.current?.focus());
      return;
    }
    setError("");
    setWorking(true);
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const data = await apiRequest("/public/appointments/", {
        method: "POST",
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          starts_at: slot,
          idempotency_key: key.current,
          turnstile_token: token,
        }),
      });
      setSaved(data);
    } catch (e) {
      setError(e.message);
      if (e.status === 409) {
        setSlot("");
        setRefresh((n) => n + 1);
        key.current = "";
      }
      challenge.current?.reset();
      setToken("");
    } finally {
      setWorking(false);
    }
  };
  return (
    <section
      className="booking-layout shell section"
      id="book"
      aria-labelledby="booking-title"
    >
      <Reveal as="aside" className="booking-intro">
        <p className="section-label">Book a call</p>
        <h2 id="booking-title">
          A real conversation.
          <br />A clear next step.
        </h2>
        <p>
          A free 30-minute consultation to talk through your goals, ask
          questions, and explore what’s possible.
        </p>
        <div className="consultation-photo">
          <img
            src={consultingMeeting}
            alt="A friendly consultation about a business website, with a laptop and notes on the table"
            width="1122"
            height="1402"
            loading="lazy"
          />
        </div>
        <ol className="booking-agenda">
          {[
            [
              "Talk about your goals",
              "Where you are, where you want to go, and what’s in the way.",
            ],
            [
              "Explore ideas together",
              "The right design, tools, and approach for your business.",
            ],
            [
              "Leave with clarity",
              "A clear next step, whether we work together or not.",
            ],
          ].map(([title, copy]) => (
            <li key={title}>
              <div>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
      <Reveal as="section" className="booking-panel" delay={0.1}>
        {saved ? (
          <div className="form-success" role="status">
            <Check size={32} />
            <h3>Your time is reserved.</h3>
            <p>
              Your consultation request is saved. I’ll confirm the call by email
              and send the details for our conversation.
            </p>
            <p>
              {formatConsultation(slot)} · {CONSULTATION_TIME_LABEL}
            </p>
            <Link
              className="button button--red"
              to={`/book/manage?id=${saved.id}&token=${encodeURIComponent(saved.manage_token)}`}
            >
              Manage your consultation <ArrowUpRight size={17} />
            </Link>
            <Link to="/#start-a-project">Share a brief before we talk</Link>
          </div>
        ) : (
          <form
            className="form-stack"
            onSubmit={submit}
            noValidate
            aria-busy={working}
          >
            {attempted && !ready && (
              <div
                className="notice notice--error booking-validation"
                role="alert"
                tabIndex={-1}
                ref={validationSummary}
              >
                <strong>A few details are still needed.</strong>
                <ul>
                  {Object.values(requiredErrors).map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
            <SlotPicker value={slot} onChange={setSlot} refresh={refresh} />
            <fieldset
              className="booking-contact"
              disabled={!slot || working}
              aria-describedby="booking-contact-help"
            >
              <legend>Your contact details</legend>
              <p id="booking-contact-help" className="form-help">
                {slot
                  ? "All three fields are required so I can confirm your call."
                  : "Choose a date and time above to unlock your contact details."}
              </p>
              <div className="form-row">
                <Field
                  label="First name"
                  autoComplete="given-name"
                  maxLength={100}
                  error={attempted ? requiredErrors.first_name : undefined}
                  required
                  value={form.first_name}
                  onChange={(e) => change("first_name", e.target.value)}
                />
                <Field
                  label="Last name"
                  autoComplete="family-name"
                  maxLength={100}
                  error={attempted ? requiredErrors.last_name : undefined}
                  required
                  value={form.last_name}
                  onChange={(e) => change("last_name", e.target.value)}
                />
              </div>
              <Field
                label="Email address"
                autoComplete="email"
                maxLength={254}
                error={attempted ? requiredErrors.email : undefined}
                type="email"
                required
                value={form.email}
                onChange={(e) => change("email", e.target.value)}
              />
            </fieldset>
            <Notice error={error} />
            {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
              <Turnstile
                ref={challenge}
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                onSuccess={setToken}
                onExpire={() => setToken("")}
              />
            )}
            <button
              className="button button--red booking-submit"
              disabled={working}
              aria-describedby="booking-submit-help"
              data-incomplete={!ready || undefined}
            >
              {working ? "Reserving your time…" : "Request consultation"}
            </button>
            <p className="form-help" id="booking-submit-help">
              {!ready &&
                "Complete the required details to request your call. Press the button to see what’s missing. "}
              Your time is reserved while I confirm our call. You’ll receive an
              email with the next steps. All appointments use{" "}
              {CONSULTATION_TIME_LABEL}. <Link to="/#privacy">Privacy</Link>
            </p>
          </form>
        )}
      </Reveal>
    </section>
  );
}
export function ManageBooking() {
  const [params] = useSearchParams();
  const id = params.get("id"),
    token = params.get("token");
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [slot, setSlot] = useState("");
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const path = `/public/appointments/${id}/manage/`;
  useEffect(() => {
    if (!id || !token) {
      setError("Open the secure consultation link from your email.");
      return;
    }
    apiRequest(`${path}?token=${encodeURIComponent(token)}`)
      .then(setAppointment)
      .catch((e) => setError(e.message));
  }, [id, token, path]);
  const action = async (action) => {
    setWorking(true);
    setError("");
    try {
      await apiRequest(path, {
        method: "POST",
        body: JSON.stringify({ token, action, starts_at: slot }),
      });
      setAppointment(
        await apiRequest(`${path}?token=${encodeURIComponent(token)}`),
      );
      setEditing(false);
      setSuccess(
        action === "cancel"
          ? "Your consultation has been cancelled."
          : "Your new time is reserved, pending confirmation.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };
  return (
    <section className="shell section manage-booking">
      <h1>Your consultation.</h1>
      <p>All appointments are shown in {CONSULTATION_TIME_LABEL}.</p>
      <Notice error={error} success={success} />
      {appointment && (
        <>
          <p>{formatConsultation(appointment.starts_at)}</p>
          <p>
            Status: <strong>{appointment.status}</strong>
          </p>
          <a
            className="text-link"
            href={`${API_BASE}${path}?token=${encodeURIComponent(token)}&download=calendar`}
          >
            <Download size={16} /> Download calendar entry
          </a>
          {!["cancelled", "completed"].includes(appointment.status) &&
            new Date(appointment.starts_at) > new Date() && (
              <>
                {editing ? (
                  <div className="booking-panel form-stack">
                    <SlotPicker value={slot} onChange={setSlot} />
                    <button
                      className="button button--red"
                      disabled={!slot || working}
                      onClick={() => action("reschedule")}
                    >
                      Request new time
                    </button>
                    <button
                      className="button button--ghost"
                      onClick={() => setEditing(false)}
                    >
                      Keep current time
                    </button>
                  </div>
                ) : (
                  <div className="actions">
                    <button className="button" onClick={() => setEditing(true)}>
                      Choose another time
                    </button>
                    <button
                      className="button button--ghost"
                      disabled={working}
                      onClick={() => action("cancel")}
                    >
                      Cancel consultation
                    </button>
                  </div>
                )}
              </>
            )}
        </>
      )}
    </section>
  );
}
