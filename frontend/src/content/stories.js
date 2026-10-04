// "Behind the project" copy, written for business owners rather than developers.
// `included` and `tools` are [name, plain-language explanation] pairs. Only list
// tools that were actually used on that project.
export const stories = {
  marcd: {
    type: "Founder-led product",
    intro: "A platform built with purpose.",
    challenge:
      "Truck drivers often struggle to find a safe, legal place to park and rest. Marc’d puts parking information and helpful resources in one place, built around the people on the road.",
    approach:
      "I designed and built all of it: the public website that explains Marc’d to drivers, parking hosts, and tow providers, plus the platform and mobile app behind it. Each audience gets a clear path to what they need, and every page works well on a phone.",
    included: [
      [
        "Product and screen design",
        "Planning how every page and app screen looks and works before a line of code is written.",
      ],
      [
        "Marketing website",
        "The public site that explains the service and invites people to get early access.",
      ],
      [
        "Full platform",
        "The behind-the-scenes system that stores accounts and parking information and keeps the website and app in sync.",
      ],
      ["Mobile app", "An app drivers can use right from the road."],
    ],
    tools: [
      [
        "Stripe + RevenueCat",
        "Trusted payment services that handle payments and subscriptions securely.",
      ],
      [
        "Google Maps + TomTom",
        "Mapping services that show locations and help drivers find parking.",
      ],
      [
        "Built-in security",
        "Protections that block bots and automated scraping and control who can access what.",
      ],
    ],
    note: "My own founder-led product. Read the Marc’d story for the lived experience behind the platform.",
  },
  "bds-talent-group": {
    type: "Business website",
    intro: "Clarity and credibility, from the first click.",
    challenge:
      "An accounting and talent firm needed a website that explains its services clearly and makes it easy for new clients to take the next step.",
    approach:
      "I built a custom marketing website that lays out the firm’s accounting and talent services in clear sections, works on any screen, and includes a private admin dashboard for the business side.",
    included: [
      [
        "Custom page layouts",
        "Pages designed for this firm, not a recycled template.",
      ],
      [
        "Works on every screen",
        "The layout adjusts itself to phones, tablets, and computers.",
      ],
      [
        "Clear service pages",
        "Each service explained so visitors know exactly what they’re getting.",
      ],
      [
        "Admin dashboard",
        "A private back office for managing the business behind the website.",
      ],
    ],
    tools: [
      ["Netlify", "The hosting service that keeps the site online and fast."],
    ],
  },
  "clip-culture": {
    type: "Business website",
    intro: "A digital presence with its own personality.",
    challenge:
      "A neighborhood barbershop wanted a website with as much personality as the shop itself, one that also makes it easy to learn about the business.",
    approach:
      "I designed a modern site around the shop’s brand, with clear service information and a simple experience on phones. It’s set up so online booking can be added.",
    included: [
      [
        "Brand-led design",
        "Colors, type, and imagery that feel like the shop, not a generic template.",
      ],
      [
        "Works on every screen",
        "Looks and reads right on the phone in a customer’s hand.",
      ],
      ["Service information", "What the shop offers, at a glance."],
      [
        "Booking-ready",
        "Built so customers can book online when the shop is ready.",
      ],
    ],
    tools: [
      ["Netlify", "The hosting service that keeps the site online and fast."],
    ],
  },
  "leapfrog-analytics": {
    type: "Dashboard project",
    intro: "Turning information into something useful.",
    challenge:
      "Businesses collect a lot of data in files and spreadsheets, but raw files don’t tell you much on their own. People need a simple way to turn them into answers.",
    approach:
      "I built a dashboard where you add your data files and get easy-to-read reports in one place. It also reports on SEO and AEO: how easily a business is found on Google and by AI assistants like ChatGPT.",
    included: [
      ["Dashboard", "One screen that pulls the important numbers together."],
      [
        "Data upload",
        "A simple step for adding your files, with no technical setup.",
      ],
      [
        "Reporting views",
        "Easy-to-read summaries that turn data into decisions.",
      ],
      [
        "SEO + AEO reporting",
        "Shows how visible a business is on search engines and AI assistants.",
      ],
    ],
    tools: [
      ["Netlify", "The hosting service that keeps the site online and fast."],
    ],
  },
  "mattel-ai-lab": {
    type: "Class / concept project",
    intro: "An exploration of brand storytelling and AI.",
    challenge:
      "A class assignment: imagine how a familiar brand could tell its story in a fresh way using AI-inspired ideas.",
    approach:
      "I created a custom landing page that combines visual storytelling with an AI-inspired brand concept. It’s an educational project, not commissioned work for Mattel.",
    included: [
      ["Concept development", "The idea and the story the page tells."],
      [
        "Landing page design",
        "A single page built to grab attention and hold it.",
      ],
      [
        "Visual storytelling",
        "Images and layout that carry the message, not just the words.",
      ],
      [
        "AI creative exploration",
        "Trying AI tools as part of the creative process.",
      ],
    ],
    tools: [
      ["Netlify", "The hosting service that keeps the site online and fast."],
    ],
    note: "Independent class project. Not affiliated with or endorsed by Mattel.",
  },
};
