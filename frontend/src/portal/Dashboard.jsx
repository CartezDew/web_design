import { useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  LogOut,
  LayoutDashboard,
  Folder,
  MessageSquare,
  CalendarDays,
  User,
  Clock,
  FileText,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { Logo } from "../components/SiteLayout";
import { Notice, Field } from "../components/Controls";
import { apiRequest } from "../api";
import { useRecords } from "./useRecords";
import { ProjectsPanel, BriefsPanel } from "./ProjectsPanel";
import {
  MessagesPanel,
  AppointmentsPanel,
  AvailabilityPanel,
} from "./ManagementPanels";
import InsightsPanel from "./InsightsPanel";
import "./Dashboard.css";
export function More({ records }) {
  return records.next ? (
    <button
      className="button button--ghost"
      disabled={records.loading}
      onClick={records.more}
    >
      {records.loading ? "Loading…" : "Load more"}
    </button>
  ) : null;
}
function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    company: user.company,
    phone: user.phone,
  });
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [working, setWorking] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setWorking(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest("/auth/profile/", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setUser(updated);
      setSuccess("Your profile has been updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };
  return (
    <section className="portal-panel profile-panel">
      <h2>Your details.</h2>
      <p>Keep the best way to reach you up to date.</p>
      <form className="form-stack" onSubmit={submit}>
        <Notice error={error} success={success} />
        <div className="form-row">
          {[
            ["first_name", "First name"],
            ["last_name", "Last name"],
          ].map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ))}
        </div>
        <Field
          label="Company"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
        <Field
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Field
          label="Account email"
          value={user.email}
          readOnly
          hint="Contact Cartez if your account email needs to change."
        />
        <button className="button button--red" disabled={working}>
          {working ? "Saving…" : "Save profile"}
        </button>
        <Link to="/reset-password">Reset your password</Link>
      </form>
    </section>
  );
}
export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  if (loading)
    return (
      <main className="portal-loading" role="status">
        Opening your project space…
      </main>
    );
  if (!user)
    return (
      <Navigate to="/sign-in" state={{ from: location.pathname }} replace />
    );
  const section = location.pathname.split("/")[2] || "overview";
  const nav = [
    ["overview", LayoutDashboard],
    ["projects", Folder],
    ...(user.is_admin ? [["briefs", FileText]] : []),
    ...(user.is_admin ? [["insights", BarChart3]] : []),
    ["messages", MessageSquare],
    ["appointments", CalendarDays],
    ...(user.is_admin ? [["availability", Clock]] : []),
    ["profile", User],
  ];
  const leave = async () => {
    try {
      await signOut();
      // Clear route state and any private data retained by the current tab.
      window.location.assign("/");
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="portal-app">
      <aside className="portal-sidebar">
        <Logo />
        <div className="portal-person">
          <strong>{user.first_name || "Welcome"}</strong>
          <span>{user.is_admin ? "Administrator" : "Client portal"}</span>
        </div>
        <nav aria-label="Portal navigation">
          {nav.map(([name, Icon]) => (
            <NavLink
              key={name}
              to={name === "overview" ? "/dashboard" : `/dashboard/${name}`}
              end={name === "overview"}
            >
              <Icon size={18} />
              {name}
            </NavLink>
          ))}
        </nav>
        <button className="portal-signout" onClick={leave}>
          <LogOut size={17} />
          Sign out
        </button>
      </aside>
      <main className="portal-main">
        <header className="portal-header">
          <div>
            <p className="section-label">
              {user.is_admin ? "Your studio" : "Your project space"}
            </p>
            <h1>
              {section === "overview"
                ? user.is_admin
                  ? "A clear view of your business."
                  : "Your project, all in one place."
                : section[0].toUpperCase() + section.slice(1)}
            </h1>
            <p>
              {section === "overview"
                ? `Welcome back, ${user.first_name || "there"}. Here’s what’s happening.`
                : "The details that keep everything moving."}
            </p>
          </div>
          <Link className="text-link" to="/">
            View website <ArrowUpRight size={16} />
          </Link>
        </header>
        <Notice error={error} />
        {section === "insights" && user.is_admin ? (
          <InsightsPanel />
        ) : section === "profile" ? (
          <Profile />
        ) : section === "messages" ? (
          <MessagesPanel />
        ) : section === "appointments" ? (
          <AppointmentsPanel />
        ) : section === "availability" && user.is_admin ? (
          <AvailabilityPanel />
        ) : section === "briefs" && user.is_admin ? (
          <BriefsPanel />
        ) : section === "projects" ? (
          <ProjectsPanel />
        ) : section === "overview" ? (
          <Overview />
        ) : (
          <p>Choose a section from the navigation.</p>
        )}
      </main>
    </div>
  );
}
function Overview() {
  const { user } = useAuth();
  const projects = useRecords(
    user.is_admin ? "/admin/projects/" : "/projects/",
  );
  return (
    <>
      <Notice error={projects.error} />
      {projects.loading && !projects.data.length ? (
        <p className="empty-state">Loading your projects…</p>
      ) : projects.data.length ? (
        <>
          <div className="portal-panel">
            <p className="section-label">
              {user.is_admin ? "Recent project" : "Your current project"}
            </p>
            <h2>{projects.data[0].name}</h2>
            <p>
              {projects.data[0].summary ||
                "Updates, files, and conversations live together in your project space."}
            </p>
            <ProjectProgress status={projects.data[0].status} />
            <Link className="text-link" to="/dashboard/projects">
              View project details <ArrowUpRight size={16} />
            </Link>
          </div>
        </>
      ) : (
        <section className="portal-panel">
          <h2>Your next chapter starts here.</h2>
          <p>
            {user.is_admin
              ? "New inquiries will appear as clients submit their briefs."
              : "Your project will appear here once it has been set up."}
          </p>
          <Link className="button button--red" to="/#start-a-project">
            Send a project brief
          </Link>
        </section>
      )}
      <div className="portal-quick-links">
        <Link to="/dashboard/messages">
          <MessageSquare size={20} />
          <strong>Keep the conversation going</strong>
          <span>View your messages →</span>
        </Link>
        <Link to={user.is_admin ? "/dashboard/appointments" : "/#book"}>
          <CalendarDays size={20} />
          <strong>Make time for the next step</strong>
          <span>
            {user.is_admin ? "Manage consultations" : "Book a conversation"} →
          </span>
        </Link>
      </div>
      {user.is_admin && <BriefsPanel compact />}
    </>
  );
}
export function ProjectProgress({ status }) {
  const steps = [
    "discovery",
    "planning",
    "design",
    "development",
    "review",
    "launched",
  ];
  const active = steps.indexOf(status);
  return (
    <div className="project-progress" aria-label={`Project status: ${status}`}>
      {steps.map((step, i) => (
        <div
          key={step}
          className={i <= active ? "is-complete" : ""}
          aria-current={step === status ? "step" : undefined}
        >
          <span />
          {step === "review" ? "Client review" : step}
        </div>
      ))}
      {status === "paused" && <p>Project paused</p>}
    </div>
  );
}
