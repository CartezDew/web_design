import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import { Notice } from "../components/Controls";
import { businessTypes, serviceInterests } from "../analytics/catalog";
import "./InsightsPanel.css";

const labels = Object.fromEntries([...businessTypes, ...serviceInterests].map(({ value, label }) => [value, label]));
Object.assign(labels, { unspecified: "Not provided / not tracked", recommendation: "Needs a recommendation", not_sure: "Not sure yet", needs_help: "Needs copy or visuals", partial: "Some content ready", ready: "Content ready", untagged: "No campaign tag" });
const label = (value) => labels[value] || value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const questions = [
  ["service_interest", "Which services attract real projects?", "Compare requested services with projects created before changing your offer."],
  ["business_type", "Which businesses are a good fit?", "Use this to choose examples, case studies and outreach audiences."],
  ["primary_goal", "What are customers trying to achieve?", "Use customers’ selected goals to explain the outcomes your services provide."],
  ["package_tier", "Which starting packages work?", "Package interest is a preference, not agreed revenue or willingness to pay."],
  ["content_readiness", "Where do customers need more help?", "Demand for copy and visuals can reveal a useful service or package addition."],
  ["campaign_source", "Which sources bring project inquiries?", "Campaign attribution is available only when visitors allow analytics."],
  ["campaign_id", "Which campaigns lead to projects?", "Tag links in social posts, emails and QR codes to distinguish campaigns."],
  ["device_category", "Do mobile inquiries become projects?", "Compare this with the device funnel in GA4 to find form friction."],
];

export default function InsightsPanel() {
  const [days, setDays] = useState(90), [data, setData] = useState(null), [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError("");
    apiRequest(`/admin/insights/?days=${days}`).then((value) => { if (active) setData(value); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [days, revision]);
  const propertyId = /^\d+$/.test(data?.tracking.property_id || "") ? data.tracking.property_id : null;
  return (
    <section className="business-insights">
      <div className="insights-toolbar">
        <div><h2>Customer needs & business outcomes</h2><p>Saved inquiries, confirmations and projects from your business records.</p></div>
        <label>Inquiry period <select aria-label="Inquiry period" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 365 days</option>
        </select></label>
      </div>
      <Notice error={error} />
      {error && <button className="button button--ghost" onClick={() => setRevision((n) => n + 1)}>Try again</button>}
      {!data && !error && <p role="status">Loading business insights…</p>}
      {data && <>
        <div className="insights-metrics">
          {[["Project briefs", "briefs"], ["Email confirmed", "confirmed_briefs"], ["Projects created", "projects"], ["Projects launched", "launched_projects"], ["Call requests", "booking_requests"], ["Calls email confirmed", "confirmed_bookings"], ["Consultations completed", "completed_consultations"], ["Calls cancelled", "cancelled_bookings"]].map(([title, key]) =>
            <article className="portal-panel" key={key}><span>{title}</span><strong>{data.totals[key]}</strong></article>)}
        </div>
        <p className="insights-note">Counts follow inquiries created in the selected period and their current outcomes. Briefs and call requests are separate; the same person may send both. Deleted records are excluded. These are saved records, not visitor counts or revenue.</p>
        <div className="portal-panel insights-google">
          <div><h3>Visitor journeys in Google Analytics</h3><p>Use GA4 for visitors, traffic sources, location, engagement time, section views and form drop-off. Use this page for saved leads and project outcomes.</p>
            <p>{data.tracking.configured ? `Website tracking configured · ${data.tracking.server_conversions ? "Backend conversions enabled" : "Browser conversions enabled"}` : "Google Analytics connection is pending. Business insights already work from saved records."}</p>
          </div>
          {propertyId && <a className="button button--ghost" href={`https://analytics.google.com/analytics/web/#/p${propertyId}/reports/intelligenthome`} target="_blank" rel="noreferrer">Open website analytics ↗</a>}
        </div>
        <div className="insights-breakdowns">
          {data.privacy_choices && <article className="portal-panel">
            <h3>Analytics turned off</h3>
            <p><strong>{data.privacy_choices.opt_out_total}</strong> off choices in this period.</p>
            <p>{data.privacy_choices.automation_reported} reported an automation signal · {data.privacy_choices.unclassified} unclassified.</p>
            <p>Anonymous choices, not unique people. No names or visitor identifiers are recorded. Automation signals cannot prove whether a person or AI made a choice.</p>
            <p>Google receives completed daily totals. In GA4, use Event value for analytics_opt_out_total; Event count measures summary batches.</p>
          </article>}
          {questions.map(([key, title, description]) => <article className="portal-panel" key={key}>
            <h3>{title}</h3><p>{description}</p>
            {data.breakdowns[key].length ? <div className="insights-table-wrap"><table>
              <caption className="sr-only">{title}</caption>
              <thead><tr><th scope="col">Category</th><th scope="col">Briefs</th><th scope="col">Projects</th><th scope="col">Rate</th></tr></thead>
              <tbody>{data.breakdowns[key].map((row) => <tr key={row.value}><th scope="row">{label(row.value)}</th><td>{row.leads}</td><td>{row.projects}</td><td>{row.project_rate}%</td></tr>)}</tbody>
            </table></div> : <p className="empty-state">No inquiries in this period yet.</p>}
          </article>)}
        </div>
        <p className="insights-note">Rates are projects created ÷ briefs in that category. Small samples can be misleading; compare a longer period before changing services or pricing. Historical inquiries without structured answers remain “Not provided / not tracked.”</p>
      </>}
    </section>
  );
}
