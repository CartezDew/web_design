import { ChevronDown } from "lucide-react";
import "./Privacy.css";
export default function Privacy() {
  return (
    <section className="privacy-section shell" aria-label="Privacy">
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
            Application records are stored with Railway. Uploaded files are held
            in private Google Cloud Storage. Resend delivers service emails.
            Cloudflare Turnstile helps protect public forms from automated
            abuse. These providers process information needed to deliver their
            respective services.
          </p>
          <h3>Cookies and tracking</h3>
          <p>
            Essential session and security cookies support account sign-in and
            protect forms. This release does not include advertising or audience
            analytics tracking.
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
