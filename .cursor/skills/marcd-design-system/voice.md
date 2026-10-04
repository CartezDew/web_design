# Copy voice

The site is written by one person, in first person, to a small-business owner who is not technical and is deciding whether to trust him.

## Tone

Direct, warm, specific. A Marine veteran and former owner-operator who builds software — competent without posturing.

- Write "I", never "we". There is no team, and pretending otherwise undercuts the entire positioning.
- Name the outcome, not the technology. "Customers can book at midnight" beats "React + Django booking integration".
- Concrete beats clever. "You work directly with me, from the first idea to launch" is the strongest sentence on the site because it is a promise a competitor cannot copy.
- No hype adjectives: cutting-edge, seamless, robust, world-class, leverage, synergy, unlock, elevate, supercharge.
- No em-dash-heavy sentence stacking. Short declaratives carry more authority.

## Headlines

Display type punishes long lines. Keep headlines under 7 words where possible, and write them so one word can carry the red marker (`<em>`).

Good:
- "Websites that make small businesses feel *big!*"
- "A real conversation. A clear next step."
- "Good ideas. *Real-world* work."
- "A clear path from idea to *launch.*"

Avoid:
- "Comprehensive full-stack web development solutions for growing businesses"

## Section intros

One or two sentences, max. The job of an intro is to let the reader skip it without losing the thread.

## Trust language

Lead with proof, not claims. Veteran, owner-operator, founder of Marc'd, direct access to the builder, clear pricing. These are facts, and facts read as confidence. "Trusted by businesses nationwide" reads as filler.

## Buttons and labels

Verb plus object, in the reader's words: "Plan your website", "Book a call", "See my work". Never "Submit", "Learn more", or "Get started".

## Conversion microcopy

The page exists to start conversations. Small lines near the big asks do a lot of that work.

- **Reassurance under CTAs.** Use only facts that are already true and already stated elsewhere on the site: "Free 30-minute consultation. Clear scope before work begins." Never invent guarantees, numbers, or testimonials.
- **Mid-page nudges are short and personal.** "Your business could be *next.*" sits after the portfolio. One line, one button.
- **Two doors, always.** Offer *Plan your website* (brief) and *Book a free call* (conversation). Some owners write, some talk.
- **Price tags carry context.** Keep "Starting price · timeline" and the "Most popular" flag. Don't add urgency ("only 2 spots left") unless it is literally true.
- **Button labels repeat the promise, not the mechanism.** "Plan your website", not "Open form".

## Project stories ("Behind the project")

Written for a business owner, not a developer. Each story in `frontend/src/content/stories.js` has:

- **The challenge:** the business problem, in one or two sentences.
- **What I built:** what the owner got, in first person.
- **What's included:** `[name, plain explanation]` pairs. The name can be a real term ("Admin dashboard"). The explanation says what it *does for them*.
- **Tools behind it:** only tools actually used on that project, each explained by its job ("Stripe: handles payments securely"). Never list a framework or service you can't confirm for that specific project.
