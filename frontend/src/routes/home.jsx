import { useRef, useState } from "react";
import { LeadContactProvider } from "../components/LeadContactContext";
import SiteLayout from "../components/SiteLayout";
import BackToTop from "../components/BackToTop";
import MobileCTA from "../components/MobileCTA";
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
import {
  homeBase,
  serviceAreas,
  servedCountry,
  servedRegions,
} from "../content/locations";
export const meta = () =>
  pageMeta(
    "Web Design for Small Businesses in Metro Atlanta",
    "Custom websites, booking systems, and SEO for small businesses in metro Atlanta, Marietta, Alpharetta, and Decatur — plus remote projects nationwide.",
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
        <MobileCTA onPlan={openIntake} />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": ["Organization", "ProfessionalService"],
                "@id": `${siteUrl}/#business`,
                name: "Cartez Dewberry — Web Design & Development",
                legalName: "Marc-D Group LLC",
                url: siteUrl,
                email: "letsbuild@marcdbycartez.com",
                telephone: "+14043541272",
                founder: { "@id": `${siteUrl}/#cartez` },
                description:
                  "Custom web design, full-stack development, booking systems, integrations, and SEO/AEO for small businesses. Based in metro Atlanta, serving Georgia, Alabama, and Tennessee in person and the rest of the United States remotely.",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: homeBase.city,
                  addressRegion: homeBase.region,
                  addressCountry: homeBase.country,
                },
                areaServed: [
                  { "@type": "Country", name: servedCountry },
                  ...servedRegions.map(({ name }) => ({
                    "@type": "State",
                    name,
                  })),
                  ...serviceAreas.map(({ city, region }) => ({
                    "@type": "City",
                    name: city,
                    containedInPlace: {
                      "@type": "AdministrativeArea",
                      name: region,
                    },
                  })),
                ],
                serviceArea: {
                  "@type": "GeoCircle",
                  geoMidpoint: {
                    "@type": "GeoCoordinates",
                    latitude: homeBase.latitude,
                    longitude: homeBase.longitude,
                  },
                  geoRadius: homeBase.radiusMeters,
                },
                knowsAbout: [
                  "Small business web design",
                  "Responsive website development",
                  "Online booking systems",
                  "Local SEO",
                  "Answer engine optimization",
                ],
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
