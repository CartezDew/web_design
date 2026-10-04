import { track, trackSaved, failureClass } from "../analytics/client";
import {
  businessTypes,
  serviceInterests,
  leadProperties,
} from "../analytics/catalog";
import { useFormAnalytics } from "../analytics/useFormAnalytics";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ArrowUpRight,
  Search,
  Mail,
  ChevronDown,
} from "lucide-react";
import { getLocalTimeZone, today } from "@internationalized/date";
import { Turnstile } from "@marsidev/react-turnstile";
import {
  Field,
  CustomSelect,
  CustomDatePicker,
  ChoiceGroup,
  Notice,
} from "../components/Controls";
import {
  useLeadContact,
  validContactEmail,
} from "../components/LeadContactContext";
import FilePicker from "../components/FilePicker";
import {
  apiRequest,
  uploadAsset,
  releaseAsset,
  preparePublicForm,
} from "../api";
import FormSpamTrap from "../components/FormSpamTrap";
import Reveal from "../Reveal";
import IntakeModal from "../components/IntakeModal";
import {
  buildBriefPayload,
  intakePlans,
  intakeReviewGroups,
} from "../content/intake";
import "./IntakePage.css";
export default function IntakePage({
  modalOpen = false,
  selectedPackage = null,
  onModalClose = () => {},
  returnFocusRef,
}) {
  const [params] = useSearchParams();
  const plans = intakePlans;
  const initial =
    plans.find((p) => p.toLowerCase() === params.get("package")) ||
    "I need a recommendation";
  const [step, setStep] = useState(0);
  const { contact, updateContact } = useLeadContact();
  const [details, setForm] = useState({
    company: "",
    business_type: "",
    service_interest: "",
    phone: "",
    overview: "",
    features: "",
    goal: "",
    launch_date: "",
    package: initial,
    inspiration_link: "",
    notes: "",
    mission: "",
    domain: "",
    success: "",
    offerings: "",
    brand: "",
    integrations: "",
    content_readiness: "",
    decision_maker: "",
  });
  const form = { ...details, name: contact.name, email: contact.email };
  const stepId = ["contact", "direction", "review"][step];
  const formAnalytics = useFormAnalytics("brief", stepId);
  const contactErrors = {
    ...(!form.name.trim() && { name: "Enter your name." }),
    ...(!validContactEmail(form.email) && {
      email: "Enter a real email address, like name@example.com.",
    }),
    ...(!form.overview.trim() && {
      overview: "Tell me what you have in mind.",
    }),
  };
  const contactReady = Object.keys(contactErrors).length === 0;
  const [files, setFiles] = useState([]);
  const [brief, setBrief] = useState(null);
  const [working, setWorking] = useState(false);
  const [complete, setComplete] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const key = useRef("");
  const challenge = useRef(null);
  const spamTrap = useRef(null);
  const validationSummary = useRef(null);
  const verificationError =
    step === 2 && !brief && import.meta.env.VITE_TURNSTILE_SITE_KEY && !token
      ? {
          verification:
            "Complete the security check before sending your brief.",
        }
      : {};
  const requiredErrors =
    step === 0
      ? contactErrors
      : step === 2
        ? { ...(!contactReady ? contactErrors : {}), ...verificationError }
        : {};
  const ready = Object.keys(requiredErrors).length === 0;
  useEffect(() => {
    preparePublicForm().catch(() => {});
  }, []);
  const heading = useRef(null);
  const errorHeading = useRef(null);
  useEffect(() => {
    if (error) errorHeading.current?.focus();
  }, [error]);
  useEffect(() => {
    if (params.has("package") && !brief) {
      setForm((current) => ({ ...current, package: initial }));
    }
  }, [initial, params, brief]);
  useEffect(() => {
    if (modalOpen && selectedPackage && !brief) {
      setForm((current) => ({ ...current, package: selectedPackage }));
    }
  }, [modalOpen, selectedPackage, brief]);
  const update = (name, value) => {
    formAnalytics.start();
    if (
      [
        "business_type",
        "service_interest",
        "goal",
        "package",
        "content_readiness",
      ].includes(name)
    )
      track("form_choice", {
        form_type: "brief",
        step_id: stepId,
        field_id: name,
        ...leadProperties({ ...form, [name]: value }),
      });
    if (name === "name" || name === "email") updateContact(name, value);
    else setForm((f) => ({ ...f, [name]: value }));
  };
  const move = (n) => {
    if (n !== step)
      track("form_step_view", {
        form_type: "brief",
        step_id: ["contact", "direction", "review"][n],
      });
    setStep(n);
    setAttempted(false);
    setError("");
    requestAnimationFrame(() => heading.current?.focus());
  };
  const showValidation = () => {
    track("form_submit_error", {
      form_type: "brief",
      step_id: stepId,
      failure_class: "validation",
    });
    requestAnimationFrame(() => validationSummary.current?.focus());
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
    if (working) return;
    setAttempted(true);
    if (!brief && !contactReady) {
      if (step !== 0) {
        setStep(0);
        setError("");
      }
      showValidation();
      return;
    }
    if (step < 2) {
      track("form_step_complete", { form_type: "brief", step_id: stepId });
      move(step + 1);
      return;
    }
    if (Object.keys(verificationError).length) {
      showValidation();
      return;
    }
    track("form_submit_attempt", {
      form_type: "brief",
      ...leadProperties(form),
    });
    setWorking(true);
    setError("");
    if (!key.current) key.current = crypto.randomUUID();
    let saved = brief;
    try {
      if (!saved) {
        saved = await apiRequest("/public/briefs/", {
          method: "POST",
          body: JSON.stringify({
            ...buildBriefPayload(form),
            idempotency_key: key.current,
            turnstile_token: token,
            contact_fax: spamTrap.current?.value || "",
          }),
        });
        setBrief(saved);
        trackSaved(saved.id, "brief", leadProperties(form));
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
          track("upload_outcome", { form_type: "brief", outcome: "success" });
        } catch (uploadError) {
          track("upload_outcome", {
            form_type: "brief",
            outcome: "error",
            failure_class: failureClass(uploadError),
          });
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
      if (!saved)
        track("form_submit_error", {
          form_type: "brief",
          failure_class: failureClass(e),
        });
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
  const closeForNavigation = () => {
    if (returnFocusRef) returnFocusRef.current = null;
    onModalClose();
  };
  const formPanel = (
    <section className="intake-form-panel surface--light">
      {complete ? (
        <div className="form-success" role="status">
          <Check size={32} />
          <h3>Your idea is in good hands.</h3>
          <p>
            Your brief{files.length ? " and files have" : " has"} been saved.
            Check {form.email} for your confirmation link, then press Confirm
            email. I can review your brief now; your email needs to be confirmed
            before I create your project. The link works for 48 hours. Check
            your junk folder if it hasn’t arrived.
          </p>
          <ol className="intake-next-steps">
            <li>We talk through your goals and clarify any open questions.</li>
            <li>
              You receive a proposed scope, estimate, and timeline to review.
            </li>
            <li>Once we agree on the plan, design and development begin.</li>
          </ol>
          <Link
            className="button button--red"
            to="/#book"
            onClick={closeForNavigation}
          >
            Let’s put a conversation on the calendar <ArrowUpRight size={17} />
          </Link>
          <Link to="/#work" onClick={closeForNavigation}>
            Explore more work
          </Link>
        </div>
      ) : (
        <>
          <div className="intake-progress">
            <div className="intake-progress-head">
              <span>Step {step + 1} of 3</span>
              <span>
                {["Let’s start", "Taking shape", "Ready to review"][step]}
              </span>
            </div>
            <ol className="intake-steps">
              {["Your idea", "The details", "Files & review"].map(
                (label, i) => (
                  <li
                    key={label}
                    aria-current={i === step ? "step" : undefined}
                    className={
                      i === step ? "is-current" : i < step ? "is-done" : ""
                    }
                  >
                    <span>{i < step ? <Check size={12} /> : i + 1}</span>
                    {label}
                  </li>
                ),
              )}
            </ol>
            <div
              className="intake-progress-bar"
              role="progressbar"
              aria-label="Project brief steps"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={step + 1}
            >
              <span style={{ width: `${((step + 1) / 3) * 100}%` }} />
            </div>
          </div>
          <h3 ref={heading} tabIndex="-1">
            {
              [
                "First, a little about you.",
                "Let’s give your idea shape.",
                "Review and send your brief.",
              ][step]
            }
          </h3>
          <p className="intake-step-help">
            {
              [
                "Only your name, email, and idea are required. A few sentences are enough to get started.",
                "Share what you know. Optional details help me recommend the right approach; we can work out the rest on our call.",
                "Check your answers and add optional files. Sending a brief starts a conversation and does not commit you to a project.",
              ][step]
            }
          </p>
          <form
            className="form-stack"
            onSubmit={send}
            onFocusCapture={formAnalytics.start}
            noValidate
          >
            <FormSpamTrap inputRef={spamTrap} />
            {attempted && !ready && (
              <div
                className="notice notice--error intake-validation"
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
            {error && (
              <div ref={errorHeading} tabIndex="-1" className="intake-error">
                <Notice error={error} />
              </div>
            )}
            <fieldset
              className="intake-step-fields form-stack"
              key={step}
              disabled={working}
            >
              <legend className="sr-only">
                {
                  [
                    "Contact and business",
                    "Project direction",
                    "Files and review",
                  ][step]
                }
              </legend>
              {step === 0 && (
                <>
                  <div className="form-row">
                    <Field
                      label="Your name"
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={200}
                      error={attempted ? contactErrors.name : undefined}
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                    />
                    <Field
                      label="Email address"
                      name="email"
                      autoComplete="email"
                      type="email"
                      maxLength={254}
                      required
                      error={attempted ? contactErrors.email : undefined}
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <Field
                      label="Company or project name"
                      maxLength={200}
                      autoComplete="organization"
                      value={form.company}
                      onChange={(e) => update("company", e.target.value)}
                    />
                    <Field
                      label="Phone (optional)"
                      autoComplete="tel"
                      type="tel"
                      maxLength={32}
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <CustomSelect
                      label="Business category (optional)"
                      value={form.business_type}
                      onChange={(value) => update("business_type", value)}
                      options={businessTypes}
                    />
                    <CustomSelect
                      label="Service you’re interested in (optional)"
                      value={form.service_interest}
                      onChange={(value) => update("service_interest", value)}
                      options={serviceInterests}
                    />
                  </div>
                  <Field
                    label="What do you have in mind?"
                    multiline
                    required
                    maxLength={10000}
                    placeholder="What does your business do, and what should your new website or app help people do?"
                    error={attempted ? contactErrors.overview : undefined}
                    value={form.overview}
                    onChange={(e) => update("overview", e.target.value)}
                  />
                  <Field
                    label="Who do you want to reach? (optional)"
                    multiline
                    maxLength={10000}
                    hint="Describe your ideal customers, where you serve them, and what makes your business different."
                    value={form.mission}
                    onChange={(e) => update("mission", e.target.value)}
                  />
                  <Field
                    label="Current website or domain (optional)"
                    maxLength={253}
                    placeholder="yourbusiness.com"
                    hint="If you already have a site, I can review what works and what needs to improve."
                    value={form.domain}
                    onChange={(e) => update("domain", e.target.value)}
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
                      "Take bookings",
                      "Sell products",
                      "Improve my website",
                      "Build an app",
                      "Connect my tools",
                      "Let’s figure it out",
                    ]}
                  />
                  <Field
                    label="What would success look like? (optional)"
                    multiline
                    maxLength={10000}
                    placeholder="More qualified inquiries, easier bookings, fewer manual tasks…"
                    hint="Tell me the change you want to see in your business."
                    value={form.success}
                    onChange={(e) => update("success", e.target.value)}
                  />
                  <Field
                    label="Pages or features you’re thinking about"
                    multiline
                    maxLength={10000}
                    placeholder="A portfolio, online booking, a client portal…"
                    value={form.features}
                    onChange={(e) => update("features", e.target.value)}
                  />
                  <CustomSelect
                    label="Starting package"
                    value={form.package}
                    onChange={(v) => update("package", v)}
                    options={plans}
                  />
                  <p className="form-help">
                    Not sure which package fits? Choose a recommendation. We’ll
                    agree on the scope and estimate after we talk.
                  </p>
                  <CustomDatePicker
                    label="Ideal launch date (optional)"
                    value={form.launch_date}
                    min={today(getLocalTimeZone()).toString()}
                    onChange={(v) => update("launch_date", v)}
                  />
                  <Field
                    label="A website that inspires you (optional)"
                    type="url"
                    maxLength={1000}
                    placeholder="https://"
                    autoCapitalize="off"
                    hint="Use a full link, like https://example.com. You can add more references and what you like about them in the last step."
                    value={form.inspiration_link}
                    onChange={(e) => update("inspiration_link", e.target.value)}
                  />
                  <details className="intake-discovery-details">
                    <summary>
                      Content, brand & tools (optional){" "}
                      <ChevronDown size={17} aria-hidden="true" />
                    </summary>
                    <div className="form-stack">
                      <Field
                        label="Products or services to feature"
                        multiline
                        maxLength={10000}
                        hint="List your main offers, any prices you want to show, and your priorities."
                        value={form.offerings}
                        onChange={(e) => update("offerings", e.target.value)}
                      />
                      <CustomSelect
                        label="How ready is your content?"
                        value={form.content_readiness}
                        onChange={(v) => update("content_readiness", v)}
                        options={[
                          "My copy and images are ready",
                          "Some materials are ready",
                          "I need help with copy or visuals",
                          "I’m not sure yet",
                        ]}
                      />
                      <Field
                        label="Brand direction"
                        multiline
                        maxLength={10000}
                        hint="Share colors, a logo, styles you like, and what you like about your inspiration site."
                        value={form.brand}
                        onChange={(e) => update("brand", e.target.value)}
                      />
                      <Field
                        label="Tools to connect"
                        multiline
                        maxLength={10000}
                        placeholder="Booking software, payments, a CRM, email marketing, analytics…"
                        hint="Tool names are enough. Please don’t share passwords or access keys here."
                        value={form.integrations}
                        onChange={(e) => update("integrations", e.target.value)}
                      />
                      <Field
                        label="Who will approve the work?"
                        maxLength={200}
                        hint="You, a business partner, or a team? This helps us plan feedback and decisions."
                        value={form.decision_maker}
                        onChange={(e) =>
                          update("decision_maker", e.target.value)
                        }
                      />
                    </div>
                  </details>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="intake-file-guidance">
                    <p>
                      Add screenshots of websites you like, logos and current
                      images you want used, design ideas, or a PDF with project
                      notes.
                    </p>
                    <p>
                      In the notes below, tell me which files are inspiration
                      and which you want used in your website. Files are
                      optional; you can share them later.
                    </p>
                    <small>
                      Please leave out passwords, payment details, and
                      confidential customer records.
                    </small>
                  </div>
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
                      maxLength={10000}
                      hint="Tell me what you like about your references, how you want the uploaded files used, or a deadline I should plan around."
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                    />
                  )}
                  <div className="brief-review">
                    {intakeReviewGroups.map((group) => (
                      <section key={group.title}>
                        <div className="brief-review-heading">
                          <h4>{group.title}</h4>
                          {!brief && (
                            <button
                              type="button"
                              className="text-link"
                              aria-label={`Edit ${group.title.toLowerCase()}`}
                              onClick={() => move(group.step)}
                            >
                              Edit <ArrowLeft size={13} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                        <dl>
                          {group.fields
                            .filter(([key]) => form[key])
                            .map(([key, label]) => (
                              <div key={key}>
                                <dt>{label}</dt>
                                <dd>
                                  {[...businessTypes, ...serviceInterests].find(
                                    (item) => item.value === form[key],
                                  )?.label || form[key]}
                                </dd>
                              </div>
                            ))}
                        </dl>
                      </section>
                    ))}
                    {form.notes && (
                      <section>
                        <h4>Additional context</h4>
                        <p>{form.notes}</p>
                      </section>
                    )}
                    <p className="brief-file-summary">
                      {files.length
                        ? `${files.length} file${files.length === 1 ? "" : "s"} attached`
                        : "No files added. You can share materials later."}
                    </p>
                  </div>
                  <p className="form-help">
                    By submitting, you’re asking me to contact you about this
                    project. Your files are private.{" "}
                    <Link to="/#privacy" onClick={closeForNavigation}>
                      How your information is used
                    </Link>
                    .
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
            </fieldset>
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
              <button
                className="button button--red"
                data-analytics-id={
                  step < 2 ? "form_brief_continue" : "form_brief_submit"
                }
                disabled={working}
                data-incomplete={!ready || undefined}
                aria-describedby="intake-submit-help"
              >
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
            <p className="form-help" id="intake-submit-help">
              {!ready &&
                "Complete the required details to continue. Press the button to see what’s missing. "}
            </p>
          </form>
          <p className="intake-draft-note">
            You can close and reopen this form without losing your answers.
            Refreshing or leaving this page clears your unsent draft.
          </p>
        </>
      )}
    </section>
  );
  return (
    <>
      <section
        className="intake-section section surface--espresso"
        id="start-a-project"
        aria-labelledby="intake-title"
      >
        <div className="intake-layout shell">
          <Reveal as="aside" className="intake-intro">
            <p className="section-label">Project intake</p>
            <h2 id="intake-title">Tell me what you’re building.</h2>
            <p>
              Share what you know now. We’ll clarify the rest together during
              your discovery call.
            </p>
            <div className="intake-expectations">
              <strong>What happens next?</strong>
              <ol>
                <li>I review your brief and follow up by email.</li>
                <li>We talk through your goals in a discovery call.</li>
                <li>
                  You review a clear scope, estimate, and timeline before work
                  begins.
                </li>
              </ol>
            </div>
            <div className="intake-tip">
              <Search size={20} aria-hidden="true" />
              <div>
                <strong>Still need a domain?</strong>
                <p>
                  You can purchase one through GoDaddy, Namecheap, or Netlify.
                  Keep the account in your name; I can help connect it.
                </p>
              </div>
            </div>
            <div className="intake-tip">
              <Mail size={20} aria-hidden="true" />
              <div>
                <strong>Look professional from day one.</strong>
                <p>
                  Consider a branded address such as info@yourcompany.com or
                  yourname@yourcompany.com. We can discuss setup on our call.
                </p>
              </div>
            </div>
            <p className="intake-help">
              Prefer to talk it through first?
              <br />
              <Link to="/#book">Book a free 30-minute call ↗</Link>
            </p>
          </Reveal>
          {modalOpen ? (
            <div className="intake-modal-placeholder" aria-hidden="true" />
          ) : (
            <Reveal>{formPanel}</Reveal>
          )}
        </div>
      </section>
      <IntakeModal
        open={modalOpen}
        onClose={onModalClose}
        returnFocusRef={returnFocusRef}
      >
        {formPanel}
      </IntakeModal>
    </>
  );
}
