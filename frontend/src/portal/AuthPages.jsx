import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { ArrowRight, House } from "lucide-react";
import { apiRequest, resetCsrf } from "../api";
import { useAuth } from "../AuthContext";

function PortalNotice({ error, success }) {
  if (!error && !success) return null;
  return (
    <div
      className={error ? "portal-notice is-error" : "portal-notice"}
      role="status"
    >
      {error || success}
    </div>
  );
}

export function SignInPage() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setWorking(true);
    try {
      await signIn(form.email, form.password);
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <AuthLayout eyebrow="Client portal" title="Welcome back.">
      <form className="auth-form" onSubmit={submit}>
        <PortalNotice error={error} />
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
          />
        </label>
        <button className="button button--accent" disabled={working}>
          {working ? (
            "Signing in…"
          ) : (
            <>
              Sign In <ArrowRight size={18} />
            </>
          )}
        </button>
        <Link className="auth-link" to="/reset-password">
          Forgot your password?
        </Link>
      </form>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState({ error: "", success: "" });
  const hasToken = params.has("uid") && params.has("token");

  const submit = async (event) => {
    event.preventDefault();
    setNotice({ error: "", success: "" });
    try {
      if (hasToken) {
        await apiRequest("/auth/password-reset/confirm/", {
          method: "POST",
          body: JSON.stringify({
            uid: params.get("uid"),
            token: params.get("token"),
            password,
          }),
        });
        setNotice({
          error: "",
          success: "Password updated. You can now sign in.",
        });
      } else {
        const data = await apiRequest("/auth/password-reset/", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setNotice({ error: "", success: data.detail });
      }
    } catch (error) {
      setNotice({ error: error.message, success: "" });
    }
  };

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title={hasToken ? "Choose a new password." : "Reset your password."}
    >
      <form className="auth-form" onSubmit={submit}>
        <PortalNotice {...notice} />
        {hasToken ? (
          <label>
            New password
            <input
              type="password"
              minLength="12"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        ) : (
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
        )}
        <button className="button button--accent">
          {hasToken ? "Update password" : "Send reset link"}
        </button>
        <Link className="auth-link" to="/sign-in">
          Return to Sign In
        </Link>
      </form>
    </AuthLayout>
  );
}

export function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    password: "",
  });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await apiRequest("/auth/invitations/accept/", {
        method: "POST",
        body: JSON.stringify({ ...form, token: params.get("token") }),
      });
      resetCsrf();
      setUser(data.user);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <AuthLayout eyebrow="Secure invitation" title="Set up your portal.">
      <form className="auth-form" onSubmit={submit}>
        <PortalNotice error={error} />
        <div className="portal-form-row">
          <label>
            First name
            <input
              required
              value={form.first_name}
              onChange={(event) =>
                setForm({ ...form, first_name: event.target.value })
              }
            />
          </label>
          <label>
            Last name
            <input
              required
              value={form.last_name}
              onChange={(event) =>
                setForm({ ...form, last_name: event.target.value })
              }
            />
          </label>
        </div>
        <label>
          Password
          <input
            type="password"
            minLength="12"
            required
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
          />
        </label>
        <small>Use at least 12 characters and avoid common passwords.</small>
        <button className="button button--accent">Activate account</button>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({ eyebrow, title, children }) {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link className="wordmark" to="/" aria-label="Home">
          C<span>/</span>D
        </Link>
        <Link className="auth-home-link" to="/" aria-label="Back to home">
          <House size={20} aria-hidden="true" />
          <span>Home</span>
        </Link>
      </header>
      <section className="auth-card">
        <p className="kicker">{eyebrow}</p>
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  );
}

import "./AuthPages.css";
