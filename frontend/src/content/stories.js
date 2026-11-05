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
    intro: "A full rebuild for a Sandy Springs barbershop.",
    challenge:
      "Clip Culture has cut hair in Sandy Springs since 2017, but its old website showed only a small part of the business. Founder David Brown also sells his own grooming products and apparel, mentors barbers, speaks at events, and offers advertising, vending, and franchise partnerships. Customers needed a fast way to book, and partners needed a clear way to reach him.",
    approach:
      "I rebuilt the site from scratch around the shop’s look and David’s story. Customers can check services and prices, then book with their barber in a couple of taps. Every product and apparel item has its own page, and each opportunity has its own short form. I moved the old pages over so existing links keep working, and set up the hours, prices, and location so Google and AI assistants can answer questions about the shop.",
    included: [
      [
        "Full redesign",
        "Fourteen pages built around the shop’s brand, photos, and founder story.",
      ],
      [
        "Online booking",
        "Every Book Now button takes customers straight to their barber’s booking calendar.",
      ],
      [
        "Product and apparel pages",
        "A page for each grooming product and apparel item, plus a gallery of the shop’s work.",
      ],
      [
        "Inquiry forms",
        "Forms for jobs, franchising, advertising, mentorship, and speaking, each answered with a branded thank-you email.",
      ],
      [
        "Found on Google and AI search",
        "Hours, prices, and location written so Google and assistants like ChatGPT can answer questions about the shop.",
      ],
      [
        "Old links still work",
        "Pages from the previous website forward to their new home, so customers and search rankings aren’t lost.",
      ],
    ],
    tools: [
      [
        "Squire + Acuity",
        "The booking apps the barbers already use, linked from every Book Now button.",
      ],
      [
        "EmailJS",
        "Delivers form messages to the shop and sends each visitor a thank-you email.",
      ],
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
