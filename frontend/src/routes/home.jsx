import { useRef, useState } from "react";
import { LeadContactProvider } from "../components/LeadContactContext";
import SiteLayout from "../components/SiteLayout";
import BackToTop from "../components/BackToTop";
import { pageMeta } from "../content/seo";
import Ticker from "../sections/Ticker";
import Hero from "../sections/Hero";
import Work from "../sections/Work";
import Services from "../sections/Services";
import About from "../sections/About";
import Process from "../sections/Process";
import Pricing from "../sections/Pricing";
import FAQ from "../sections/FAQ";
import BookingPage from "../pages/BookingPage";
import IntakePage from "../pages/IntakePage";
import Privacy from "../sections/Privacy";
import ContactCTA from "../sections/ContactCTA";
import { JsonLd, siteUrl } from "../content/seo";
export const meta = () =>
  pageMeta(
    "Custom Web Design & Development",
    "Work directly with Cartez Dewberry on custom websites, booking systems, integrations, and SEO/AEO. Clear scope, personal guidance, and responsive design.",
    "/",
  );
export default function Page() {
  const [intakeOpen, setIntakeOpen] = useState(false);
  const intakeTrigger = useRef(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const openIntake = (trigger, packageName = null) => {
    intakeTrigger.current = trigger;
    setSelectedPackage(packageName);
    setIntakeOpen(true);
  };
  return (
    <LeadContactProvider>
      <SiteLayout>
        <Hero onPlan={openIntake} />
        <Ticker />
        <Work />
        <Services />
        <About />
        <Process />
        <Pricing onPlan={openIntake} />
        <FAQ />
        <ContactCTA />
        <BookingPage />
        <IntakePage
          modalOpen={intakeOpen}
          selectedPackage={selectedPackage}
          onModalClose={() => setIntakeOpen(false)}
          returnFocusRef={intakeTrigger}
        />
        <Privacy />
        <BackToTop />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${siteUrl}/#business`,
                name: "Cartez Dewberry — Web Design & Development",
                legalName: "Marc-D Group LLC",
                url: siteUrl,
                email: "letsbuild@marcdbycartez.com",
                telephone: "+14043541272",
                founder: { "@id": `${siteUrl}/#cartez` },
                description:
                  "Custom web design, full-stack development, booking systems, integrations, and SEO/AEO for small businesses.",
              },
              {
                "@type": "Person",
                "@id": `${siteUrl}/#cartez`,
                name: "Cartez Dewberry",
                url: `${siteUrl}/#about`,
                sameAs: ["https://www.linkedin.com/in/cartez-dewberry/"],
                worksFor: { "@id": `${siteUrl}/#business` },
                jobTitle: "Software engineer and founder",
              },
              {
                "@type": "WebSite",
                "@id": `${siteUrl}/#website`,
                url: siteUrl,
                name: "Cartez Dewberry — Web Design & Development",
                publisher: { "@id": `${siteUrl}/#business` },
                inLanguage: "en",
              },
            ],
          }}
        />
      </SiteLayout>
    </LeadContactProvider>
  );
}
