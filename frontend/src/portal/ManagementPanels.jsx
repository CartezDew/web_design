import { useState } from "react";
import { Link } from "react-router-dom";
import { Send, Download } from "lucide-react";
import { apiRequest, API_BASE } from "../api";
import { useAuth } from "../AuthContext";
import {
  Field,
  CustomSelect,
  CustomDatePicker,
  Notice,
} from "../components/Controls";
import {
  CONSULTATION_TIME_LABEL,
  formatConsultation,
} from "../content/scheduling";
import { SlotPicker } from "../pages/BookingPage";
import { useRecords } from "./useRecords";
import { More } from "./Dashboard";
import "./MessagesPanel.css";
import "./AppointmentsPanel.css";
import "./AvailabilityPanel.css";
export function MessagesPanel() {
  const records = useRecords("/conversations/");
  const { user } = useAuth();
  const [activeId, setActiveId] = useState(""),
    [body, setBody] = useState(""),
    [error, setError] = useState(""),
    [working, setWorking] = useState(false);
  const active = records.data.find((i) => i.id === activeId) || records.data[0];
  const send = async (e) => {
    e.preventDefault();
    if (!active || !body.trim()) return;
    setWorking(true);
    setError("");
    try {
      await apiRequest(`/conversations/${active.id}/messages/`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      });
      setBody("");
      records.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };
  return (
    <section className="portal-panel">
      <div className="panel-heading">
        <h2>Your conversations.</h2>
        <button
          className="button button--ghost"
          onClick={records.reload}
          disabled={records.loading}
        >
          Refresh
        </button>
      </div>
      <Notice error={error || records.error} />
      {!records.data.length ? (
        <p className="empty-state">
          {records.loading
            ? "Loading conversations…"
            : "A conversation opens when your project is created."}
        </p>
      ) : (
        <div className="messages-layout">
          <nav aria-label="Project conversations">
            {records.data.map((item) => (
              <button
                className={active?.id === item.id ? "is-active" : ""}
                key={item.id}
                onClick={() => {
                  setActiveId(item.id);
                  setBody("");
                }}
              >
                {item.subject}
              </button>
            ))}
            <More records={records} />
          </nav>
          <div className="message-thread">
            <div className="message-history" aria-live="polite">
              {active.messages.map((message) => (
                <article
                  key={message.id}
                  className={message.sender?.id === user.id ? "is-own" : ""}
                >
                  <strong>
                    {message.sender?.first_name || "Project team"}
                  </strong>
                  <p>{message.body}</p>
                  <time>{new Date(message.created_at).toLocaleString()}</time>
                </article>
              ))}
              {!active.messages.length && (
                <p className="empty-state">
                  Start the conversation. Your messages stay with this project.
                </p>
              )}
            </div>
            <form className="form-stack" onSubmit={send}>
              <Field
                label="Your message"
                multiline
                maxLength={5000}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="A question, an idea, or a little feedback…"
              />
              <button
                className="button button--red"
                disabled={working || !body.trim()}
              >
                {working ? "Sending…" : "Send message"}
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
export function AppointmentsPanel() {
  const records = useRecords("/appointments/");
  const { user } = useAuth();
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [editing, setEditing] = useState(null),
    [slot, setSlot] = useState(""),
    [working, setWorking] = useState(false);
  const mutate = async (item, body, method = "PATCH") => {
    setError("");
    setWorking(true);
    try {
      await apiRequest(`/appointments/${item.id}/`, {
        method,
        ...(method === "DELETE" ? {} : { body: JSON.stringify(body) }),
      });
      setSuccess(
        method === "DELETE"
          ? "Consultation cancelled."
          : "Consultation updated.",
      );
      setEditing(null);
      setSlot("");
      records.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };
  return (
    <>
      <section className="portal-panel">
        <div className="panel-heading">
          <h2>Upcoming conversations.</h2>
          <Link className="button button--red" to="/#book">
            Book a call
          </Link>
        </div>
        <Notice error={error || records.error} success={success} />
        {!records.data.length && (
          <p className="empty-state">
            {records.loading
              ? "Loading consultations…"
              : "No consultations yet."}
          </p>
        )}
        <p className="form-help">
          All meetings and scheduling use {CONSULTATION_TIME_LABEL}.
        </p>
        <div className="appointment-list">
          {records.data.map((item) => (
            <article key={item.id}>
              <div className="appointment-summary">
                <div>
                  <strong>{formatConsultation(item.starts_at)}</strong>
                  <p>
                    {item.first_name} {item.last_name} · {item.email}
                  </p>
                </div>
                <span className="status-label">{item.status}</span>
              </div>
              <div className="appointment-actions">
                {user.is_admin && (
                  <CustomSelect
                    label="Appointment status"
                    value={item.status}
                    options={["pending", "confirmed", "completed", "cancelled"]}
                    disabled={working}
                    onChange={(status) => mutate(item, { status })}
                  />
                )}
                <a
                  className="text-link"
                  href={`${API_BASE}/appointments/${item.id}/calendar/`}
                >
                  <Download size={14} />
                  Calendar
                </a>
                {!["cancelled", "completed"].includes(item.status) &&
                  new Date(item.starts_at) > new Date() && (
                    <>
                      <button
                        className="text-link"
                        disabled={working}
                        onClick={() => {
                          setEditing(item);
                          setSlot("");
                        }}
                      >
                        Reschedule
                      </button>
                      <button
                        className="text-link"
                        disabled={working}
                        onClick={() => mutate(item, null, "DELETE")}
                      >
                        Cancel
                      </button>
                    </>
                  )}
              </div>
            </article>
          ))}
        </div>
        <More records={records} />
      </section>
      {editing && (
        <section className="portal-panel appointment-editor">
          <h2>Choose another time.</h2>
          <SlotPicker value={slot} onChange={setSlot} />
          <div className="actions">
            <button
              className="button button--red"
              disabled={!slot || working}
              onClick={() => mutate(editing, { starts_at: slot })}
            >
              Save new time
            </button>
            <button
              className="button button--ghost"
              onClick={() => setEditing(null)}
            >
              Keep current time
            </button>
          </div>
        </section>
      )}
    </>
  );
}
const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const times = Array.from({ length: 48 }, (_, i) => {
  const value = `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
  return {
    value,
    label: `${Math.floor(i / 2) % 12 || 12}:${i % 2 ? "30" : "00"} ${i < 24 ? "AM" : "PM"}`,
  };
});
export function AvailabilityPanel() {
  const rules = useRecords("/admin/availability-rules/"),
    overrides = useRecords("/admin/availability-overrides/");
  const [form, setForm] = useState({
    weekday: "0",
    start_time: "10:00",
    end_time: "17:00",
    slot_minutes: 30,
    is_active: true,
  });
  const [date, setDate] = useState(""),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [working, setWorking] = useState(false);
  const run = async (operation) => {
    setWorking(true);
    setError("");
    setSuccess("");
    try {
      await operation();
      setSuccess("Availability updated.");
      rules.reload();
      overrides.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };
  const add = (e) => {
    e.preventDefault();
    run(() =>
      apiRequest("/admin/availability-rules/", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    );
  };
  const block = (e) => {
    e.preventDefault();
    if (!date) {
      setError("Choose a date to block.");
      return;
    }
    run(() =>
      apiRequest("/admin/availability-overrides/", {
        method: "POST",
        body: JSON.stringify({ date, note, is_blocked: true }),
      }),
    );
  };
  const remove = (path, id) =>
    run(() => apiRequest(`${path}${id}/`, { method: "DELETE" }));
  return (
    <>
      <Notice
        error={error || rules.error || overrides.error}
        success={success}
      />
      <p className="availability-timezone">
        All availability and appointments use {CONSULTATION_TIME_LABEL}. Clients
        see the same Eastern times when booking and in their portal.
      </p>
      <div className="availability-layout">
        <section className="portal-panel">
          <h2>Your weekly hours.</h2>
          <form className="form-stack" onSubmit={add}>
            <CustomSelect
              label="Day"
              value={form.weekday}
              options={weekdays.map((label, i) => ({
                value: String(i),
                label,
              }))}
              onChange={(value) => setForm({ ...form, weekday: value })}
            />
            <div className="form-row">
              <CustomSelect
                label="Start time"
                value={form.start_time}
                options={times}
                onChange={(value) => setForm({ ...form, start_time: value })}
              />
              <CustomSelect
                label="End time"
                value={form.end_time}
                options={times}
                onChange={(value) => setForm({ ...form, end_time: value })}
              />
            </div>
            <button className="button button--red" disabled={working}>
              Add hours
            </button>
          </form>
          <ul className="availability-list">
            {rules.data.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{weekdays[item.weekday]}</strong>
                  {times.find(
                    (time) => time.value === item.start_time.slice(0, 5),
                  )?.label || item.start_time.slice(0, 5)}
                  –
                  {times.find(
                    (time) => time.value === item.end_time.slice(0, 5),
                  )?.label || item.end_time.slice(0, 5)}{" "}
                  · Eastern
                </span>
                <button
                  disabled={working}
                  onClick={() => remove("/admin/availability-rules/", item.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <More records={rules} />
        </section>
        <section className="portal-panel">
          <h2>Make room for life.</h2>
          <p>Block a date to keep it off your public calendar.</p>
          <form className="form-stack" onSubmit={block}>
            <CustomDatePicker
              label="Date to block"
              value={date}
              onChange={setDate}
            />
            <Field
              label="Note (for you)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="button button--red" disabled={working}>
              Block date
            </button>
          </form>
          <ul className="availability-list">
            {overrides.data.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.date}</strong>
                  {item.note || "Unavailable"}
                </span>
                <button
                  disabled={working}
                  onClick={() =>
                    remove("/admin/availability-overrides/", item.id)
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <More records={overrides} />
        </section>
      </div>
    </>
  );
}
