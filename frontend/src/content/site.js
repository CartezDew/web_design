import marcdShot from "../../assets/websites/marc-d.webp";
import leapfrogShot from "../../assets/websites/leap_frog.webp";
import clipCultureShot from "../../assets/websites/clip_culture.webp";
import bdsShot from "../../assets/websites/BDS_talent_Group.webp";
import classProjectShot from "../../assets/websites/class_project.webp";

export const portfolio = [
  {
    title: "Marc’d",
    category: "Full-stack platform",
    description:
      "Safe parking and real-time resources for the people who keep America moving.",
    url: "https://www.marc-d.com",
    image: marcdShot,
    featured: true,
  },
  {
    title: "BDS Talent Group",
    category: "Accounting firm",
    description:
      "A professional marketing site for an accounting and talent firm.",
    url: "https://bds-talent-group.netlify.app/",
    image: bdsShot,
  },
  {
    title: "Clip Culture",
    category: "Barbershop",
    description: "A modern booking-ready site for a neighborhood barbershop.",
    url: "https://clip-culture.netlify.app/",
    image: clipCultureShot,
  },
  {
    title: "Leapfrog Analytics",
    category: "Data dashboard",
    description: "An analytics dashboard with data upload and reporting views.",
    url: "https://leapfrogservices.netlify.app/upload",
    image: leapfrogShot,
  },
  {
    title: "Mattel × AI Lab",
    category: "Class project",
    description: "A concept landing page exploring brand storytelling with AI.",
    url: "https://joyful-kelpie-7cd0f6.netlify.app/final-website",
    image: classProjectShot,
  },
];

export const services = [
  {
    number: "01",
    title: "Web design",
    copy: "Distinct, responsive interfaces shaped around your brand—not a recycled template. Custom-coded or on Shopify.",
    value:
      "A site that looks like your business, loads fast on phones, and turns visitors into calls, bookings, and sales.",
    includes: [
      "Custom layout and brand system: colors, type, imagery",
      "Shopify websites: custom storefront design, product setup, and checkout ready to sell",
      "Mobile-first, accessible, fast-loading pages",
      "Clear calls to action: call, book, quote, or buy",
      "Copy and structure that answer the questions customers actually ask",
    ],
    proof: "BDS Talent Group · Clip Culture",
  },
  {
    number: "02",
    title: "Full-stack development",
    copy: "React front ends with Django, Node, or FastAPI back ends that make your business easier to run.",
    value:
      "More than a brochure. Booking, customer accounts, dashboards, and payments that run your business while you work.",
    includes: [
      "React front ends backed by Django, Node/Express, or FastAPI APIs",
      "PostgreSQL databases, secure logins, and role-based access",
      "Booking and scheduling systems, customer portals, and CRMs",
      "Admin dashboards so you can manage content, customers, and orders yourself",
    ],
    proof: "Marc’d platform · BDS admin dashboard · Leapfrog analytics",
  },
  {
    number: "03",
    title: "API integrations + MCP",
    copy: "Connect the tools you already use—payments, maps, email, calendars—and let AI assistants work with your data.",
    value:
      "Stop copying data between apps. I wire your site to the services you depend on, and build MCP servers so AI tools can safely read and act on your business data.",
    includes: [
      "Stripe payments, subscriptions, payouts, and webhooks",
      "Google Maps, routing, email/SMS, and calendar APIs",
      "Custom REST APIs and third-party integrations",
      "MCP servers that let ChatGPT- and Claude-style assistants work with your systems",
    ],
    proof: "Stripe + RevenueCat, Google Maps, and TomTom on Marc’d",
  },
  {
    number: "04",
    title: "SEO + AI search (AEO)",
    copy: "Search engine optimization (SEO) helps Google understand your site. Answer engine optimization (AEO) makes your business information and answers clearer for AI tools like ChatGPT and Claude.",
    value:
      "Help people and search systems understand what you do through clear answers, crawlable content, and strong technical foundations. Search placement is never guaranteed.",
    includes: [
      "Technical SEO: speed, structured data (schema), sitemaps, and metadata",
      "Answer-engine optimization (AEO): clear service answers, FAQs, and accurate business information",
      "Crawler access and content structure that support Google and AI search discovery",
      "Redesigns that make an existing site readable to AI crawlers",
      "Search Console setup and optional analytics to measure search traffic after launch",
    ],
    proof: "Leapfrog SEO/AEO dashboard · marc-d.com",
  },
  {
    number: "05",
    title: "AI content + agents",
    copy: "Custom images, cinematic videos, and AI agents that help your brand create, communicate, and work smarter.",
    value:
      "Professional visuals and a 24/7 assistant without a studio budget or an extra hire.",
    includes: [
      "AI-generated product, brand, and lifestyle imagery",
      "Cinematic promo and social videos",
      "AI chat agents trained on your services, hours, and FAQs",
      "Automated content and follow-ups grounded in your real business data",
    ],
    proof: "Financial Plug AI insights agent · Marc’d launch ads",
  },
  {
    number: "06",
    title: "Security + scraper blocking",
    copy: "Protect your content, pricing, and customer data from bots, scrapers, and abuse.",
    value:
      "Reduce automated abuse with layered protection, sensible access controls, and crawler policies. Public content cannot be made completely scrape-proof.",
    includes: [
      "Bot detection, rate limiting, and abuse logging",
      "Block AI training crawlers (GPTBot, ClaudeBot) while allowing AI search bots",
      "Secure authentication, hashed passwords, and audit trails",
      "Backups, monitoring, and safe deployments",
    ],
    proof: "Marc’d API security middleware and crawler policy",
  },
  {
    number: "07",
    title: "Launch + growth support",
    copy: "Domain, analytics, professional email, deployment, and the details that get you live—and keep you growing.",
    value:
      "You get live, you understand your numbers, and you have someone to call when something needs to change.",
    includes: [
      "Domain, DNS, SSL, and branded email setup",
      "Netlify and Railway deployment with automatic updates",
      "Google Analytics, conversion tracking, and custom analytics dashboards",
      "Training, documentation, and ongoing support plans",
    ],
    proof: "Every project I ship",
  },
];

export const packages = [
  {
    name: "Launch",
    price: "$300",
    hours: "Up to 10 hours",
    timeline: "About 3–4 days",
    description:
      "A focused online presence for a new venture or simple service business.",
    features: [
      "1–3 standard pages",
      "Responsive custom design",
      "Basic SEO setup",
      "Domain connection",
      "One revision round",
    ],
  },
  {
    name: "Business",
    price: "$750",
    hours: "Up to 20 hours",
    timeline: "About 1 week",
    description:
      "A complete marketing site built to explain your value and capture leads.",
    features: [
      "Up to 5 pages",
      "Lead capture form",
      "Analytics integration",
      "Custom page layouts",
      "Two revision rounds",
    ],
    featured: true,
  },
  {
    name: "Professional",
    price: "$1,500",
    hours: "Up to 35 hours",
    timeline: "About 2 weeks",
    description:
      "A larger, more tailored experience with business and marketing integrations.",
    features: [
      "Up to 10 pages",
      "Advanced forms",
      "Third-party integrations",
      "Enhanced components",
      "Launch assistance",
    ],
  },
];

export const faqs = [
  {
    question: "What does the website process look like?",
    answer:
      "First, you complete the project intake and share your goals, audience, desired pages, features, brand materials, and inspiration. We then hold a discovery call, confirm the scope and estimate, create the design, build and test the site, complete revisions, and launch it. You will know what is happening at each stage.",
  },
  {
    question: "How long will my project take?",
    answer:
      "Estimated timelines are 3–4 days for Launch, 1 week for Business, and 2 weeks for Professional. These are planning estimates—not guaranteed completion dates. Timing can change based on the final scope, custom features, integrations, content readiness, revision speed, and how quickly feedback is provided.",
  },
  {
    question: "How does pricing work?",
    answer:
      "Package prices are starting points based on the listed features and agreed scope. After the intake and discovery call, you receive a scope that explains the deliverables and estimated cost. E-commerce, authentication, APIs, dashboards, large content migrations, or other custom functionality may require a custom quote. No out-of-scope work is added without your approval.",
  },
  {
    question: "What should I share during the initial project intake?",
    answer:
      "Share your business goals, services, audience, logo, colors, copy, photos, desired features, and any current website. Images or links to websites you enjoy are especially helpful. The more inspiration references you provide—and the more clearly you explain what you like about each one—the better the final design can match your vision.",
  },
  {
    question: "What are SEO and AEO?",
    answer:
      "SEO (search engine optimization) helps search engines crawl and understand your website. AEO (answer engine optimization) makes your services, expertise, and answers easier for search and AI tools to interpret. I focus on helpful content, clear headings, fast pages, metadata, structured data, and appropriate crawler access. These foundations support discovery; no one can guarantee a Google ranking or an AI recommendation.",
  },
  {
    question: "Can we talk before I complete the project form?",
    answer:
      "Yes. Book a free 30-minute consultation if you prefer to talk it through. If you send a brief first, only your name, email, and a short description are required. Share what you know; we will clarify your goals, audience, content, and features together before agreeing on a scope.",
  },
  {
    question: "Who will I work with, and what happens after launch?",
    answer:
      "You work directly with me, Cartez, through discovery, design, development, and launch. Before launch, we test the agreed features and review how you will manage the site. I provide a handoff for the work in scope. Ongoing maintenance, hosting, content updates, and analytics can be discussed as part of your project plan.",
  },
  {
    question: "What is an API integration?",
    answer:
      "An API lets different software systems communicate. An integration can connect your website to tools such as Stripe payments, Google Maps, calendars, email platforms, CRMs, inventory systems, or booking software so information moves automatically instead of being copied by hand.",
  },
  {
    question: "What are MCP servers and AI agents?",
    answer:
      "MCP (Model Context Protocol) is a secure way to connect AI tools to approved business data and actions. An AI agent can then answer customer questions, search internal information, help with workflows, or perform specific tasks within the permissions you define.",
  },
  {
    question: "Will I be able to update the website myself?",
    answer:
      "That depends on the project. I can build an admin dashboard, connect a content management system, use Shopify for products, or provide training for common updates. We will choose the simplest approach that fits how often your content changes.",
  },
  {
    question: "What do I need to provide before work starts?",
    answer:
      "At minimum, provide a clear point of contact, your business information, goals, service or product details, and timely feedback. Having your logo, copy, photos, account access, and inspiration ready usually shortens the timeline. If those materials are not ready, content and branding support can be added to the scope.",
  },
];

export const serviceSlugs = [
  "web-design",
  "full-stack-development",
  "api-integrations",
  "seo-aeo",
  "ai-content-agents",
  "security",
  "launch-support",
];
services.forEach((service, i) => {
  service.slug = serviceSlugs[i];
});
export const projectSlugs = [
  "marcd",
  "bds-talent-group",
  "clip-culture",
  "leapfrog-analytics",
  "mattel-ai-lab",
];
portfolio.forEach((project, i) => {
  project.slug = projectSlugs[i];
});
export const processSteps = [
  [
    "Listen",
    "Share a brief or book a free call. We clarify your audience, goals, content, budget, and what success looks like, then agree on a scope and estimate.",
  ],
  [
    "Design",
    "I map the pages and customer journey, then share a design for your feedback before we move into development.",
  ],
  [
    "Build",
    "I build the agreed features and keep you involved with progress updates. We review the experience on desktop and mobile before launch.",
  ],
  [
    "Launch",
    "We connect your domain, check the forms and search foundations, and walk through the handoff. We also agree on any ongoing support you need.",
  ],
];
