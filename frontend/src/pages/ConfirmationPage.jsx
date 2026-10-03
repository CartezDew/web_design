import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Check, MailCheck, ArrowUpRight } from "lucide-react";
import { apiRequest } from "../api";
import { Notice } from "../components/Controls";
import {
  formatConsultation,
  CONSULTATION_TIME_LABEL,
} from "../content/scheduling";
import "./ConfirmationPage.css";

export default function ConfirmationPage() {
  const [params] = useSearchParams();
  const { hash } = useLocation();
  const kind = params.get("kind"),
    id = params.get("id");
  // Retain the email capability if keyboard users follow the Skip to content anchor.
  const [token] = useState(() =>
    new URLSearchParams(hash.slice(1)).get("token"),
  );
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);
  const appointment = kind === "appointment";
  useEffect(() => {
    let active = true;
    setRecord(null);
    setError("");
    setLoading(true);
    if (!id || !token || !["appointment", "brief"].includes(kind)) {
      setError("Open the confirmation link from your email.");
      setLoading(false);
      return;
    }
    apiRequest(`/public/confirm/?${new URLSearchParams({ kind, id })}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => {
        if (active) setRecord(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, id, token]);
  const confirm = async () => {
    if (working) return;
    setWorking(true);
    setError("");
    try {
      await apiRequest("/public/confirm/", {
        method: "POST",
        body: JSON.stringify({ kind, id, token }),
      });
      setRecord((current) => ({ ...current, confirmed: true }));
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };
  return (
    <section className="shell section confirmation-page">
      <div className="confirmation-card" aria-busy={loading || working}>
        <span className="confirmation-icon" aria-hidden="true">
          {record?.confirmed ? <Check size={28} /> : <MailCheck size={28} />}
        </span>
        <p className="section-label">One simple next step</p>
        <h1>
          {record?.confirmed
            ? appointment
              ? "Your call is confirmed."
              : "Your email is confirmed."
            : appointment
              ? "Confirm your consultation."
              : "Let’s confirm your email."}
        </h1>
        {loading && <p role="status">Checking your secure link…</p>}
        <Notice error={error} />
        {record && (
          <>
            {record.starts_at && (
              <p className="confirmation-time">
                {formatConsultation(record.starts_at)}
                <br />
                30 minutes · {CONSULTATION_TIME_LABEL}
              </p>
            )}
            {record.confirmed ? (
              <p role="status">
                {appointment
                  ? "Your appointment is booked. A confirmation email includes your details and a calendar entry. I’ll email how to join before our call."
                  : "I have your brief and your confirmed email address. I’ll follow up personally to discuss the scope, pricing, and next steps before any work begins."}
              </p>
            ) : (
              <>
                <p>
                  {appointment
                    ? "Press the button below to confirm your email and book this time."
                    : "Your brief is already saved and available to Cartez. Press the button to confirm this email address before your project is created. This doesn’t commit you to a project or payment."}
                </p>
                {appointment && (
                  <p className="form-help">
                    Please confirm before{" "}
                    {formatConsultation(record.expires_at)}. Unconfirmed times
                    are released after one hour.
                  </p>
                )}
                <button
                  className="button button--red"
                  disabled={working}
                  onClick={confirm}
                >
                  {working
                    ? "Confirming…"
                    : appointment
                      ? "Confirm appointment"
                      : "Confirm email"}
                  <ArrowUpRight size={18} />
                </button>
              </>
            )}
          </>
        )}
        {error && (
          <p>
            Your request stays saved.{" "}
            <a href="mailto:letsbuild@marcdbycartez.com">Email Cartez</a> for
            help
            {appointment && (
              <>
                , or <Link to="/#book">choose another time</Link>
              </>
            )}
            .
          </p>
        )}
        <Link className="text-link" to="/">
          Back to the website <ArrowUpRight size={16} />
        </Link>
      </div>
    </section>
  );
}
