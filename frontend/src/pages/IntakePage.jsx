import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowLeft, Check, ArrowUpRight } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import {
  Field,
  CustomSelect,
  CustomDatePicker,
  ChoiceGroup,
  Notice,
} from "../components/Controls";
import FilePicker from "../components/FilePicker";
import { apiRequest, uploadAsset, releaseAsset } from "../api";
import headshot from "../../assets/headshot.webp";
import "./IntakePage.css";
export default function IntakePage() {
  const [params] = useSearchParams();
  const plans = [
    "Launch",
    "Business",
    "Professional",
    "Custom",
    "I need a recommendation",
  ];
  const initial =
    plans.find((p) => p.toLowerCase() === params.get("package")) ||
    "I need a recommendation";
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    overview: "",
    features: "",
    goal: "",
    launch_date: "",
    package: initial,
    inspiration_link: "",
    notes: "",
  });
  const [files, setFiles] = useState([]);
  const [brief, setBrief] = useState(null);
  const [working, setWorking] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const key = useRef("");
  const challenge = useRef(null);
  const heading = useRef(null);
  useEffect(() => {
    if (params.has("package") && !brief) {
      setForm((current) => ({ ...current, package: initial }));
    }
  }, [initial, params, brief]);
  const update = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const move = (n) => {
    setStep(n);
    setError("");
    requestAnimationFrame(() => heading.current?.focus());
  };
  const remove = async (item) => {
    setError("");
    try {
      if (item.assetId) await releaseAsset(item.assetId, brief?.upload_token);
      setFiles((f) => f.filter((i) => i.key !== item.key));
    } catch (e) {
      setError(e.message);
    }
  };
  const send = async (e) => {
    e.preventDefault();
    if (step < 2) {
      move(step + 1);
      return;
    }
    setWorking(true);
    setError("");
    if (!key.current) key.current = crypto.randomUUID();
    let saved = brief;
    try {
      if (!saved) {
        saved = await apiRequest("/public/briefs/", {
          method: "POST",
          body: JSON.stringify({
            ...form,
            launch_date: form.launch_date || null,
            idempotency_key: key.current,
            turnstile_token: token,
          }),
        });
        setBrief(saved);
      }
      for (const item of files.filter((i) => i.status !== "done")) {
        setFiles((all) =>
          all.map((i) =>
            i.key === item.key ? { ...i, status: "uploading", error: "" } : i,
          ),
        );
        try {
          await uploadAsset({
            file: item.file,
            group: "inspiration",
            brief: saved.id,
            uploadToken: saved.upload_token,
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
            all.map((i) =>
              i.key === item.key ? { ...i, status: "done", progress: 100 } : i,
            ),
          );
        } catch (uploadError) {
          setFiles((all) =>
            all.map((i) =>
              i.key === item.key
                ? { ...i, status: "error", error: uploadError.message }
                : i,
            ),
          );
          throw uploadError;
        }
      }
      setComplete(true);
    } catch (e) {
      setError(
        saved
          ? `Your brief is saved. Some files still need to upload. ${e.message}`
          : e.message,
      );
      challenge.current?.reset();
      setToken("");
    } finally {
      setWorking(false);
    }
  };
  return (
    <section
      className="intake-layout shell section"
      id="start-a-project"
      aria-labelledby="intake-title"
    >
      <aside className="intake-intro">
        <p className="section-label">Start a project</p>
        <h2 id="intake-title">
          Tell me what
          <br />
          you’re building.
        </h2>
        <p>
          You don’t need to have it all figured out. Share your idea, your
          goals, and what you know so far. We’ll work through the rest together.
        </p>
        <div className="personal-note">
          <img src={headshot} alt="Cartez Dewberry" width="819" height="1024" />
          <div>
            <strong>This comes straight to me.</strong>
            <p>I’ll personally review your brief and get back to you.</p>
          </div>
        </div>
        <p className="intake-help">
          Prefer to talk it through first?
          <br />
          <Link to="/#book">Book a free 30-minute call ↗</Link>
        </p>
      </aside>
      <section className="intake-form-panel">
        {complete ? (
          <div className="form-success" role="status">
            <Check size={32} />
            <h3>Your idea is in good hands.</h3>
            <p>
              Your brief{files.length ? " and files have" : " has"} been saved.
              I’ll review everything and get back to you personally.
            </p>
            <Link className="button button--red" to="/#book">
              Let’s put a conversation on the calendar{" "}
              <ArrowUpRight size={17} />
            </Link>
            <Link to="/#work">Explore more work</Link>
          </div>
        ) : (
          <>
            <ol className="intake-steps">
              {["Your idea", "The details", "Files & review"].map(
                (label, i) => (
                  <li
                    key={label}
                    aria-current={i === step ? "step" : undefined}
                    className={i <= step ? "is-current" : ""}
                  >
                    <span>{i < step ? <Check size={12} /> : i + 1}</span>
                    {label}
                  </li>
                ),
              )}
            </ol>
            <h3 ref={heading} tabIndex="-1">
              {
                [
                  "First, a little about you.",
                  "Let’s give your idea shape.",
                  "The finishing touches.",
                ][step]
              }
            </h3>
            <form className="form-stack" onSubmit={send}>
              <Notice error={error} />
              {step === 0 && (
                <>
                  <div className="form-row">
                    <Field
                      label="Your name"
                      name="name"
                      autoComplete="name"
                      required
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                    />
                    <Field
                      label="Email address"
                      name="email"
                      autoComplete="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <Field
                      label="Company or project name"
                      autoComplete="organization"
                      value={form.company}
                      onChange={(e) => update("company", e.target.value)}
                    />
                    <Field
                      label="Phone (optional)"
                      autoComplete="tel"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </div>
                  <Field
                    label="What do you have in mind?"
                    multiline
                    required
                    maxLength={10000}
                    placeholder="Tell me about your business, your idea, or the problem you want to solve…"
                    value={form.overview}
                    onChange={(e) => update("overview", e.target.value)}
                  />
                </>
              )}
              {step === 1 && (
                <>
                  <ChoiceGroup
                    label="What’s your main goal?"
                    value={form.goal}
                    onChange={(v) => update("goal", v)}
                    options={[
                      "Attract clients",
                      "Improve my website",
                      "Build an app",
                      "Connect my tools",
                      "Let’s figure it out",
                    ]}
                  />
                  <Field
                    label="Pages or features you’re thinking about"
                    multiline
                    placeholder="A portfolio, online booking, a client portal…"
                    value={form.features}
                    onChange={(e) => update("features", e.target.value)}
                  />
                  <div className="form-row">
                    <CustomSelect
                      label="Your starting point"
                      value={form.package}
                      onChange={(v) => update("package", v)}
                      options={plans}
                    />
                    <CustomDatePicker
                      label="Ideal launch date (optional)"
                      value={form.launch_date}
                      onChange={(v) => update("launch_date", v)}
                    />
                  </div>
                  <Field
                    label="A website that inspires you (optional)"
                    type="url"
                    placeholder="https://"
                    value={form.inspiration_link}
                    onChange={(e) => update("inspiration_link", e.target.value)}
                  />
                </>
              )}
              {step === 2 && (
                <>
                  <p className="form-help">
                    Add screenshots, brand images, or a PDF brief. Everything
                    here is optional.
                  </p>
                  <FilePicker
                    items={files}
                    onChange={setFiles}
                    onRemove={remove}
                    disabled={working}
                  />
                  {!brief && (
                    <Field
                      label="Anything else I should know?"
                      multiline
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                    />
                  )}
                  <div className="brief-review">
                    <strong>
                      {form.name} · {form.company || "Your project"}
                    </strong>
                    <p>{form.email}</p>
                    <p>{form.overview}</p>
                    <p>Starting point: {form.package}</p>
                  </div>
                  <p className="form-help">
                    By submitting, you’re asking me to contact you about this
                    project. Your files are private.{" "}
                    <Link to="/#privacy">How your information is used</Link>.
                  </p>
                  {!brief && import.meta.env.VITE_TURNSTILE_SITE_KEY && (
                    <Turnstile
                      ref={challenge}
                      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                      onSuccess={setToken}
                      onExpire={() => setToken("")}
                    />
                  )}
                </>
              )}
              <div className="intake-form-nav">
                {step > 0 && !brief ? (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => move(step - 1)}
                    disabled={working}
                  >
                    <ArrowLeft size={15} /> Back
                  </button>
                ) : (
                  <span className="form-help">Step {step + 1} of 3</span>
                )}
                <button className="button button--red" disabled={working}>
                  {working
                    ? "Saving your project…"
                    : step < 2
                      ? "Continue"
                      : brief
                        ? "Retry remaining files"
                        : "Send my project brief"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </section>
  );
}
