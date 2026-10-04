import { ChevronDown } from "lucide-react";
import { PrivacyAnalyticsSettings } from "../analytics/SiteAnalytics";
import "./Privacy.css";
export default function Privacy() {
  return (
    <section
      className="privacy-section shell section--tight surface--paper"
      aria-label="Privacy"
    >
      <details id="privacy" className="privacy-disclosure">
        <summary>
          <h2>Your information, handled with care.</h2>
          <ChevronDown size={20} />
        </summary>
        <div className="privacy-copy">
          <h3>What you share</h3>
          <p>
            When you send a brief, book a call, or use your client portal,
            Marc-D Group LLC receives the contact details, project information,
            messages, and files you choose to provide.
          </p>
          <h3>How it is used</h3>
          <p>
            Your information is used to respond to your inquiry, arrange
            consultations, deliver project work, and manage your client account.
            Project inquiries are not automatically added to a marketing mailing
            list.
          </p>
          <h3>Storage and service providers</h3>
          <p>
            Application records and private uploaded files are stored with
            Railway, with separate backup copies. Microsoft 365 delivers service emails.
            Cloudflare Turnstile helps protect public forms from automated
            abuse. These providers process information needed to deliver their
            respective services.
          </p>
          <h3>Cookies and tracking</h3>
          <p>
            Essential session and security cookies support account sign-in and
            protect forms. Google Analytics measures
            visits, approximate location, device category, traffic sources,
            section views, clicks, form progress and successful requests.
            Selected business categories, service interests and package choices
            help improve our services. Names, contact details, written answers,
            uploaded files and private portal pages are excluded from analytics.
            Advertising personalization is disabled. In the United States,
            analytics is enabled by default unless you turn it off or your browser
            sends a privacy signal. Elsewhere, or when we cannot determine your
            region, it stays off unless you enable it. Existing opt-outs are respected.
            Analytics cookies and your preference can last up to six months.
            You can change your choice below or through “Privacy settings” in the
            footer. When analytics is enabled, campaign and device categories are
            also saved with your inquiry to understand which channels lead to projects.
          </p>
          <PrivacyAnalyticsSettings />
          <p>
            Turning analytics off stops further visitor tracking in this browser
            and removes its Google Analytics cookies. We keep anonymous daily
            totals of off choices and reported automation signals, without names,
            contact details, IP addresses or visitor identifiers in those totals.
            These totals may be shared with Google to measure privacy preferences.
            An automation signal does not reliably identify a person or an AI.
            Your choice does not delete information previously collected.
          </p>
          <h3>Access and retention</h3>
          <p>
            Project information is accessible to authorized administrators and
            the client account associated with the project. Information is
            retained as needed for project delivery, business records, and
            applicable obligations. Removing a file from a project hides it from
            active project access; it may remain in retained storage or backups.
          </p>
          <h3>Your choices</h3>
          <p>
            You can update profile details in your portal. To request access,
            correction, or deletion of your information, email{" "}
            <a href="mailto:letsbuild@marcdbycartez.com">
              letsbuild@marcdbycartez.com
            </a>
            . Please avoid uploading passwords, payment-card information, or
            other sensitive material that is not needed for your project.
          </p>
        </div>
      </details>
    </section>
  );
}
