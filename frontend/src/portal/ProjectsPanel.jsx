import { useState } from "react";
import { Download, Trash2, ArrowRight } from "lucide-react";
import { useAuth } from "../AuthContext";
import { apiRequest, uploadAsset, releaseAsset } from "../api";
import {
  Notice,
  CustomSelect,
  Field,
  CustomDatePicker,
} from "../components/Controls";
import FilePicker from "../components/FilePicker";
import { useRecords } from "./useRecords";
import { More, ProjectProgress } from "./Dashboard";
import "./ProjectsPanel.css";
export function BriefsPanel({ compact = false }) {
  const records = useRecords("/admin/briefs/");
  const [working, setWorking] = useState(""),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const invite = async (brief) => {
    setWorking(brief.id);
    setError("");
    try {
      const result = await apiRequest(`/admin/briefs/${brief.id}/invite/`, {
        method: "POST",
        body: "{}",
      });
      setSuccess(result.detail);
      records.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking("");
    }
  };
  return (
    <section className="portal-panel">
      <h2>{compact ? "Recent inquiries" : "Project briefs"}</h2>
      <Notice error={error || records.error} success={success} />
      {records.loading && !records.data.length && (
        <p className="empty-state">Loading inquiries…</p>
      )}
      {!records.loading && !records.data.length && !records.error && (
        <p className="empty-state">New project ideas will appear here.</p>
      )}
      <div className="brief-list">
        {records.data.map((brief) => (
          <details key={brief.id} className="brief-item">
            <summary>
              <div>
                <strong>{brief.company || brief.name}</strong>
                <span>
                  {brief.name} · {brief.email}
                </span>
              </div>
              <span className="status-label">{brief.status}</span>
            </summary>
            <div className="brief-detail">
              <p>
                <a href={`mailto:${brief.email}`}>{brief.email}</a>
                {brief.phone && (
                  <>
                    {" "}
                    · <a href={`tel:${brief.phone}`}>{brief.phone}</a>
                  </>
                )}
              </p>
              {[
                ["overview", "The idea"],
                ["goal", "Goal"],
                ["mission", "Audience and differentiators"],
                ["domain", "Current website or domain"],
                ["success", "What success looks like"],
                ["offerings", "Products or services"],
                ["features", "Pages and features"],
                ["package", "Starting package"],
                ["launch_date", "Target launch"],
                ["brand", "Brand direction"],
                ["integrations", "Integrations"],
                ["notes", "Additional context"],
              ].map(
                ([key, label]) =>
                  brief[key] && (
                    <div key={key}>
                      <h3>{label}</h3>
                      <p>{brief[key]}</p>
                    </div>
                  ),
              )}
              {brief.inspiration_link && (
                <a
                  href={brief.inspiration_link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open inspiration link ↗
                </a>
              )}
              <StoredFiles assets={brief.assets || []} />
              {
                <button
                  className="button button--red"
                  disabled={working === brief.id}
                  onClick={() => invite(brief)}
                >
                  {working === brief.id
                    ? "Creating invitation…"
                    : brief.status === "accepted"
                      ? "Send portal access link"
                      : "Accept & invite client"}
                  <ArrowRight size={16} />
                </button>
              }
            </div>
          </details>
        ))}
      </div>
      <More records={records} />
    </section>
  );
}
export function StoredFiles({ assets, onRemove, disabled = false }) {
  return (
    <ul className="stored-files">
      {assets.map((asset) => (
        <li key={asset.id}>
          <div>
            <strong>{asset.original_name}</strong>
            <small>{(asset.size / 1024 / 1024).toFixed(2)} MB</small>
          </div>
          {asset.download_url ? (
            <a
              href={asset.download_url}
              aria-label={`Download ${asset.original_name}`}
            >
              <Download size={17} />
            </a>
          ) : (
            <span className="form-help">Download unavailable</span>
          )}
          {onRemove && (
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove ${asset.original_name}`}
              onClick={() => onRemove(asset)}
            >
              <Trash2 size={16} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
export function ProjectsPanel() {
  const { user } = useAuth();
  const records = useRecords(user.is_admin ? "/admin/projects/" : "/projects/");
  return (
    <>
      <Notice error={records.error} />
      {records.loading && !records.data.length && (
        <p className="empty-state">Loading projects…</p>
      )}
      {!records.loading && !records.data.length && !records.error && (
        <section className="portal-panel">
          <h2>Room for something good.</h2>
          <p>Your projects will appear here when they’re created.</p>
        </section>
      )}
      {records.data.map((project) => (
        <Project
          key={project.id}
          project={project}
          reload={records.reload}
          admin={user.is_admin}
        />
      ))}
      <More records={records} />
    </>
  );
}
function Project({ project, reload, admin }) {
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [files, setFiles] = useState([]),
    [working, setWorking] = useState(false),
    [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    summary: project.summary,
    target_launch_date: project.target_launch_date || "",
  });
  const save = async (e) => {
    e.preventDefault();
    setError("");
    setWorking(true);
    try {
      await apiRequest(`/admin/projects/${project.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          target_launch_date: form.target_launch_date || null,
        }),
      });
      setEditing(false);
      reload();
      setSuccess("Project details updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };
  const updateStatus = async (status) => {
    setError("");
    try {
      await apiRequest(`/admin/projects/${project.id}/status/`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      reload();
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async (asset) => {
    setError("");
    try {
      await apiRequest(`/assets/${asset.id}/`, { method: "DELETE" });
      reload();
    } catch (e) {
      setError(e.message);
    }
  };
  const removeQueued = async (item) => {
    try {
      if (item.assetId) await releaseAsset(item.assetId);
      setFiles((all) => all.filter((i) => i.key !== item.key));
    } catch (e) {
      setError(e.message);
    }
  };
  const upload = async () => {
    setWorking(true);
    setError("");
    setSuccess("");
    try {
      for (const item of files.filter((i) => i.status !== "done")) {
        setFiles((all) =>
          all.map((i) =>
            i.key === item.key ? { ...i, status: "uploading" } : i,
          ),
        );
        await uploadAsset({
          file: item.file,
          project: project.id,
          requestKey: item.key,
          onPrepared: (assetId) =>
            setFiles((all) =>
              all.map((i) => (i.key === item.key ? { ...i, assetId } : i)),
            ),
          onProgress: (progress) =>
            setFiles((all) =>
              all.map((i) => (i.key === item.key ? { ...i, progress } : i)),
            ),
        });
        setFiles((all) =>
          all.map((i) => (i.key === item.key ? { ...i, status: "done" } : i)),
        );
      }
      setFiles([]);
      setSuccess("Your files have been uploaded.");
      reload();
    } catch (e) {
      setError(e.message);
      setFiles((all) =>
        all.map((i) =>
          i.status === "uploading" ? { ...i, status: "error" } : i,
        ),
      );
    } finally {
      setWorking(false);
    }
  };
  return (
    <article className="portal-panel project-panel">
      <div className="panel-heading">
        <div>
          {admin && (
            <p className="section-label">
              {project.client?.company || project.client?.email}
            </p>
          )}
          <h2>{project.name}</h2>
        </div>
        <span className="status-label">{project.status}</span>
      </div>
      <Notice error={error} success={success} />
      <p>
        {project.summary ||
          "Project details and updates will appear here as the work takes shape."}
      </p>
      <ProjectProgress status={project.status} />
      {admin && (
        <div className="project-admin-controls">
          <CustomSelect
            label="Project stage"
            value={project.status}
            options={[
              "discovery",
              "planning",
              "design",
              "development",
              "review",
              "launched",
              "paused",
            ]}
            onChange={updateStatus}
          />
          <button
            className="button button--ghost"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Close editor" : "Edit project details"}
          </button>
        </div>
      )}
      {editing && (
        <form className="form-stack project-edit" onSubmit={save}>
          <Field
            label="Project name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Field
            label="Project summary"
            multiline
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
          <CustomDatePicker
            label="Target launch date"
            value={form.target_launch_date}
            onChange={(v) => setForm({ ...form, target_launch_date: v })}
          />
          <button className="button button--red" disabled={working}>
            Save project
          </button>
        </form>
      )}
      <div className="project-columns">
        <section>
          <h3>Recent updates</h3>
          <ol className="project-history">
            {project.status_history.map((item) => (
              <li key={item.id}>
                <strong>{item.status}</strong>
                <p>{item.note || "Project stage updated."}</p>
                <time>{new Date(item.created_at).toLocaleDateString()}</time>
              </li>
            ))}
          </ol>
          {!project.status_history.length && (
            <p className="empty-state">
              Your project updates will appear here.
            </p>
          )}
        </section>
        <section>
          <h3>Project files</h3>
          <p className="form-help">
            Shared with your project team. Brief attachments count toward the
            same limit.
          </p>
          <StoredFiles
            assets={project.assets}
            onRemove={remove}
            disabled={working}
          />
          <FilePicker
            items={files}
            onChange={setFiles}
            onRemove={removeQueued}
            existing={project.assets}
            disabled={working}
          />
          {files.length > 0 && (
            <button
              className="button button--red"
              disabled={working}
              onClick={upload}
            >
              {working ? "Uploading…" : "Upload files"}
            </button>
          )}
        </section>
      </div>
    </article>
  );
}
