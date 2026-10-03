import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Check, Clock, Download } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { today } from "@internationalized/date";
import {
  CustomCalendar,
  CustomSelect,
  Field,
  Notice,
} from "../components/Controls";
import { API_BASE, apiRequest } from "../api";
import headshot from "../../assets/headshot.webp";
import "./BookingPage.css";
export function dateInZone(value, zone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type).value)
    .join("-");
}
export function SlotPicker({ value, onChange, refresh = 0 }) {
  const [zone, setZone] = useState("America/New_York");
  const [date, setDate] = useState("");
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(
    () =>
      setZone(
        Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
      ),
    [],
  );
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest(
      `/public/availability/?start=${today("America/New_York")}&days=60`,
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
      const day = dateInZone(slot, zone);
      (result[day] ||= []).push(slot);
    }
    return result;
  }, [days, zone]);
  const zones = [
    ...new Set([
      zone,
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu",
      "Europe/London",
      "Europe/Paris",
      "Asia/Kolkata",
      "Asia/Tokyo",
      "Australia/Sydney",
      "UTC",
    ]),
  ].map((v) => ({ value: v, label: v.replaceAll("_", " ") }));
  return (
    <div className="slot-picker">
      <div className="booking-heading">
        <h3>Choose a date</h3>
        <span>
          <Clock size={13} /> 30 minutes · Free
        </span>
      </div>
      <CustomCalendar
        value={date}
        onChange={(v) => {
          setDate(v);
          onChange("");
        }}
        min={today(zone).toString()}
        max={today("America/New_York").add({ days: 59 }).toString()}
        isDateUnavailable={(day) => !grouped[day.toString()]?.length}
      />
      {loading && (
        <p className="form-help" role="status">
          Checking availability…
        </p>
      )}
      {error && (
        <div className="availability-error">
          <Notice error={error} />
          <button
            className="text-link"
            type="button"
            onClick={() => setRetry((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {!loading && !error && !Object.keys(grouped).length && (
        <p className="form-help">
          There are no open times right now.{" "}
          <a href="mailto:info@marc-d.com">Email me</a> and we’ll find a time
          together.
        </p>
      )}
      <CustomSelect
        label="Your time zone"
        value={zone}
        options={zones}
        onChange={(v) => {
          setZone(v);
          setDate("");
          onChange("");
        }}
      />
      <fieldset className="time-slots">
        <legend>Available times</legend>
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
              {new Intl.DateTimeFormat("en-US", {
                timeZone: zone,
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(slot))}
            </label>
          ))
        ) : (
          <p className="form-help">Choose an available date to see times.</p>
        )}
      </fieldset>
    </div>
  );
}
export default function BookingPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });
  const [slot, setSlot] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);
  const [token, setToken] = useState("");
  const [refresh, setRefresh] = useState(0);
  const key = useRef("");
  const challenge = useRef(null);
  const change = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!slot) {
      setError("Choose an available date and time.");
      return;
    }
    setError("");
    setWorking(true);
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const data = await apiRequest("/public/appointments/", {
        method: "POST",
        body: JSON.stringify({
          ...form,
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
      <aside className="booking-intro">
        <p className="section-label">Book a call</p>
        <h2 id="booking-title">
          A real conversation.
          <br />A clear next step.
        </h2>
        <p>
          A free 30-minute consultation to talk through your goals, ask
          questions, and explore what’s possible.
        </p>
        <div className="booking-person">
          <img
            src={headshot}
            alt="Your call is with Cartez"
            width="819"
            height="1024"
          />
          <div>
            <h3>
              A conversation
              <br />
              with Cartez
            </h3>
            <p>
              Creative direction.
              <br />
              Clear thinking. Practical next steps.
            </p>
          </div>
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
          ].map(([title, copy], i) => (
            <li key={title}>
              <span>{i + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </aside>
      <section className="booking-panel">
        {saved ? (
          <div className="form-success" role="status">
            <Check size={32} />
            <h3>Your time is reserved.</h3>
            <p>
              Your consultation request is saved. I’ll confirm the call by email
              and send the details for our conversation.
            </p>
            <p>
              {new Date(slot).toLocaleString([], {
                dateStyle: "full",
                timeStyle: "short",
              })}
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
          <form className="form-stack" onSubmit={submit}>
            <SlotPicker value={slot} onChange={setSlot} refresh={refresh} />
            <div className="form-row">
              <Field
                label="First name"
                autoComplete="given-name"
                required
                value={form.first_name}
                onChange={(e) => change("first_name", e.target.value)}
              />
              <Field
                label="Last name"
                autoComplete="family-name"
                required
                value={form.last_name}
                onChange={(e) => change("last_name", e.target.value)}
              />
            </div>
            <Field
              label="Email address"
              autoComplete="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => change("email", e.target.value)}
            />
            <Notice error={error} />
            {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
              <Turnstile
                ref={challenge}
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                onSuccess={setToken}
                onExpire={() => setToken("")}
              />
            )}
            <button className="button button--red" disabled={working}>
              {working ? "Reserving your time…" : "Request consultation"}
            </button>
            <p className="form-help">
              Your time is reserved while I confirm our call. You’ll receive an
              email with the next steps. <Link to="/#privacy">Privacy</Link>
            </p>
          </form>
        )}
      </section>
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
      <Notice error={error} success={success} />
      {appointment && (
        <>
          <p>
            {new Date(appointment.starts_at).toLocaleString([], {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
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
