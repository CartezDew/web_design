import SiteLayout from "../components/SiteLayout";
import { pageMeta } from "../content/seo";
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
    "Thoughtful websites. Built around your business.",
    "Custom web design, React development, SEO and digital tools by Cartez Dewberry. A personal approach for businesses and founders.",
    "/",
  );
export default function Page() {
  return (
    <SiteLayout>
      <Hero />
      <Work />
      <Services />
      <About />
      <Process />
      <Pricing />
      <FAQ />
      <ContactCTA />
      <BookingPage />
      <IntakePage />
      <Privacy />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: "Cartez Dewberry — Web Design & Development",
          url: siteUrl,
          email: "info@marc-d.com",
          telephone: "+14043541272",
          founder: {
            "@type": "Person",
            name: "Cartez Dewberry",
            sameAs: ["https://www.linkedin.com/in/cartez-dewberry/"],
          },
          description:
            "Custom web design, full-stack development, and digital tools for businesses and founders.",
        }}
      />
    </SiteLayout>
  );
}
