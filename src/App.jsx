import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Linkedin,
  Mail,
  Menu,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import headshot from '../assets/headshot.webp'
import marcdShot from '../assets/websites/marc-d.webp'
import leapfrogShot from '../assets/websites/leap_frog.webp'
import clipCultureShot from '../assets/websites/clip_culture.webp'
import bdsShot from '../assets/websites/BDS_talent_Group.webp'
import classProjectShot from '../assets/websites/class_project.webp'
import consultationMeeting from '../assets/websites/consulting_meeting.webp'
import websiteShowcase from '../assets/websites/website_images.webp'
import Reveal from './Reveal'

const CARD_HOVER = { y: -6, transition: { duration: 0.25, ease: 'easeOut' } }

const portfolio = [
  {
    title: 'Marc’d',
    category: 'Founder-led product · Full-stack platform',
    description: 'Safe parking and real-time resources for the people who keep America moving.',
    url: 'https://www.marc-d.com',
    image: marcdShot,
    featured: true,
  },
  {
    title: 'BDS Talent Group',
    category: 'Accounting firm',
    description: 'A professional marketing site for an accounting and talent firm.',
    url: 'https://bds-talent-group.netlify.app/',
    image: bdsShot,
  },
  {
    title: 'Clip Culture',
    category: 'Barbershop',
    description: 'A modern booking-ready site for a neighborhood barbershop.',
    url: 'https://clip-culture.netlify.app/',
    image: clipCultureShot,
  },
  {
    title: 'Leapfrog Analytics',
    category: 'Data dashboard',
    description: 'An analytics dashboard with data upload and reporting views.',
    url: 'https://leapfrogservices.netlify.app/upload',
    image: leapfrogShot,
  },
  {
    title: 'Mattel × AI Lab',
    category: 'Class project',
    description: 'A concept landing page exploring brand storytelling with AI.',
    url: 'https://joyful-kelpie-7cd0f6.netlify.app/final-website',
    image: classProjectShot,
  },
]

const services = [
  {
    number: '01',
    title: 'Web design',
    copy: 'Distinct, responsive interfaces shaped around your brand—not a recycled template. Custom-coded or on Shopify.',
    value: 'A site that looks like your business, loads fast on phones, and turns visitors into calls, bookings, and sales.',
    includes: [
      'Custom layout and brand system: colors, type, imagery',
      'Shopify websites: custom storefront design, product setup, and checkout ready to sell',
      'Mobile-first, accessible, fast-loading pages',
      'Clear calls to action: call, book, quote, or buy',
      'Copy and structure that answer the questions customers actually ask',
    ],
    proof: 'BDS Talent Group · Clip Culture',
  },
  {
    number: '02',
    title: 'Full-stack development',
    copy: 'React front ends with Django, Node, or FastAPI back ends that make your business easier to run.',
    value: 'More than a brochure. Booking, customer accounts, dashboards, and payments that run your business while you work.',
    includes: [
      'React front ends backed by Django, Node/Express, or FastAPI APIs',
      'PostgreSQL databases, secure logins, and role-based access',
      'Booking and scheduling systems, customer portals, and CRMs',
      'Admin dashboards so you can manage content, customers, and orders yourself',
    ],
    proof: 'Marc’d platform · BDS admin dashboard · Leapfrog analytics',
  },
  {
    number: '03',
    title: 'API integrations + MCP',
    copy: 'Connect the tools you already use—payments, maps, email, calendars—and let AI assistants work with your data.',
    value: 'Stop copying data between apps. I wire your site to the services you depend on, and build MCP servers so AI tools can safely read and act on your business data.',
    includes: [
      'Stripe payments, subscriptions, payouts, and webhooks',
      'Google Maps, routing, email/SMS, and calendar APIs',
      'Custom REST APIs and third-party integrations',
      'MCP servers that let ChatGPT- and Claude-style assistants work with your systems',
    ],
    proof: 'Stripe + RevenueCat, Google Maps, and TomTom on Marc’d',
  },
  {
    number: '04',
    title: 'SEO + AI search (AEO)',
    copy: 'Structure and content built to be understood by people, Google, and AI tools like ChatGPT and Claude.',
    value: 'Customers now ask AI before they search. I make sure your business is the answer—on Google and inside ChatGPT, Claude, Perplexity, and Gemini.',
    includes: [
      'Technical SEO: speed, structured data (schema), sitemaps, and metadata',
      'Answer-engine optimization: llms.txt, FAQ content, and AI crawler policies',
      'Redesigns that make an existing site readable to AI crawlers',
      'Analytics that show which search engines and AI tools send you traffic',
    ],
    proof: 'Leapfrog SEO/AEO dashboard · marc-d.com',
  },
  {
    number: '05',
    title: 'AI content + agents',
    copy: 'Custom images, cinematic videos, and AI agents that help your brand create, communicate, and work smarter.',
    value: 'Professional visuals and a 24/7 assistant without a studio budget or an extra hire.',
    includes: [
      'AI-generated product, brand, and lifestyle imagery',
      'Cinematic promo and social videos',
      'AI chat agents trained on your services, hours, and FAQs',
      'Automated content and follow-ups grounded in your real business data',
    ],
    proof: 'Financial Plug AI insights agent · Marc’d launch ads',
  },
  {
    number: '06',
    title: 'Security + scraper blocking',
    copy: 'Protect your content, pricing, and customer data from bots, scrapers, and abuse.',
    value: 'Your content and prices stay yours. Competitor scrapers and AI training crawlers are blocked while real customers and AI search get through.',
    includes: [
      'Bot detection, rate limiting, and abuse logging',
      'Block AI training crawlers (GPTBot, ClaudeBot) while allowing AI search bots',
      'Secure authentication, encrypted passwords, and audit trails',
      'Backups, monitoring, and safe deployments',
    ],
    proof: 'Marc’d API security middleware and crawler policy',
  },
  {
    number: '07',
    title: 'Launch + growth support',
    copy: 'Domain, analytics, professional email, deployment, and the details that get you live—and keep you growing.',
    value: 'You get live, you understand your numbers, and you have someone to call when something needs to change.',
    includes: [
      'Domain, DNS, SSL, and branded email setup',
      'Netlify and Railway deployment with automatic updates',
      'Google Analytics, conversion tracking, and custom analytics dashboards',
      'Training, documentation, and ongoing support plans',
    ],
    proof: 'Every project I ship',
  },
]

// Each ticker item links to the "What I do" row (by number) that explains it.
const tickerItems = [
  { label: 'Full-stack development', service: '02' },
  { label: 'Web design', service: '01' },
  { label: 'Shopify websites', service: '01' },
  { label: 'React + Vite', service: '02' },
  { label: 'Django + Python APIs', service: '02' },
  { label: 'Node + Express', service: '02' },
  { label: 'PostgreSQL databases', service: '02' },
  { label: 'API integrations', service: '03' },
  { label: 'Stripe payments', service: '03' },
  { label: 'MCP servers', service: '03' },
  { label: 'Booking systems', service: '02' },
  { label: 'Admin dashboards', service: '02' },
  { label: 'Mobile apps · React Native', service: '02' },
  { label: 'SEO + AEO', service: '04' },
  { label: 'AI search optimization', service: '04' },
  { label: 'AI agents', service: '05' },
  { label: 'AI images + video', service: '05' },
  { label: 'Scraper blocking + security', service: '06' },
  { label: 'Analytics dashboards', service: '07' },
  { label: 'Responsive design', service: '01' },
  { label: 'Accessibility', service: '01' },
  { label: 'Netlify + Railway deployment', service: '07' },
]

const packages = [
  {
    name: 'Launch',
    price: '$300',
    hours: 'Up to 10 hours',
    timeline: 'About 3–4 days',
    description: 'A focused online presence for a new venture or simple service business.',
    features: ['1–3 standard pages', 'Responsive custom design', 'Basic SEO setup', 'Domain connection', 'One revision round'],
  },
  {
    name: 'Business',
    price: '$750',
    hours: 'Up to 20 hours',
    timeline: 'About 1 week',
    description: 'A complete marketing site built to explain your value and capture leads.',
    features: ['Up to 5 pages', 'Lead capture form', 'Analytics integration', 'Custom page layouts', 'Two revision rounds'],
    featured: true,
  },
  {
    name: 'Professional',
    price: '$1,500',
    hours: 'Up to 35 hours',
    timeline: 'About 2 weeks',
    description: 'A larger, more tailored experience with business and marketing integrations.',
    features: ['Up to 10 pages', 'Advanced forms', 'Third-party integrations', 'Enhanced components', 'Launch assistance'],
  },
]

const agenda = [
  { time: '00–05', title: 'Business + goals', detail: 'Your mission, audience, and definition of success.' },
  { time: '05–15', title: 'Website scope', detail: 'Pages, services, functionality, and customer journey.' },
  { time: '15–20', title: 'Brand + content', detail: 'Logo, colors, tagline, copy, and high-quality imagery.' },
  { time: '20–25', title: 'Technical needs', detail: 'Domain, email, forms, analytics, and integrations.' },
  { time: '25–30', title: 'Budget + next steps', detail: 'Recommended package, timeline, and deliverables.' },
]

const faqs = [
  {
    question: 'What does the website process look like?',
    answer: 'First, you complete the project intake and share your goals, audience, desired pages, features, brand materials, and inspiration. We then hold a discovery call, confirm the scope and estimate, create the design, build and test the site, complete revisions, and launch it. You will know what is happening at each stage.',
  },
  {
    question: 'How long will my project take?',
    answer: 'Estimated timelines are 3–4 days for Launch, 1 week for Business, and 2 weeks for Professional. These are planning estimates—not guaranteed completion dates. Timing can change based on the final scope, custom features, integrations, content readiness, revision speed, and how quickly feedback is provided.',
  },
  {
    question: 'How does pricing work?',
    answer: 'Package prices are starting points based on the listed hours and features. After the intake and discovery call, you receive a scope that explains the deliverables and estimated cost. E-commerce, authentication, APIs, dashboards, large content migrations, or other custom functionality may require a custom quote. No out-of-scope work is added without your approval.',
  },
  {
    question: 'What should I share during the initial project intake?',
    answer: 'Share your business goals, services, audience, logo, colors, copy, photos, desired features, and any current website. Images or links to websites you enjoy are especially helpful. The more inspiration references you provide—and the more clearly you explain what you like about each one—the better the final design can match your vision.',
  },
  {
    question: 'What are SEO and AEO?',
    answer: 'SEO (Search Engine Optimization) helps search engines such as Google understand and rank your website. AEO (Answer Engine Optimization) structures your content so AI tools and answer engines—such as ChatGPT, Claude, Gemini, and Perplexity—can understand, cite, and recommend your business. A strong website should account for both.',
  },
  {
    question: 'What is an API integration?',
    answer: 'An API lets different software systems communicate. An integration can connect your website to tools such as Stripe payments, Google Maps, calendars, email platforms, CRMs, inventory systems, or booking software so information moves automatically instead of being copied by hand.',
  },
  {
    question: 'What are MCP servers and AI agents?',
    answer: 'MCP (Model Context Protocol) is a secure way to connect AI tools to approved business data and actions. An AI agent can then answer customer questions, search internal information, help with workflows, or perform specific tasks within the permissions you define.',
  },
  {
    question: 'Will I be able to update the website myself?',
    answer: 'That depends on the project. I can build an admin dashboard, connect a content management system, use Shopify for products, or provide training for common updates. We will choose the simplest approach that fits how often your content changes.',
  },
  {
    question: 'What do I need to provide before work starts?',
    answer: 'At minimum, provide a clear point of contact, your business information, goals, service or product details, and timely feedback. Having your logo, copy, photos, account access, and inspiration ready usually shortens the timeline. If those materials are not ready, content and branding support can be added to the scope.',
  },
]

const formSteps = [
  {
    number: '01',
    title: 'Your business',
    intro: 'The essentials so I can reach you and understand the business.',
    gridFields: [
      { name: 'company', label: 'Company name', required: true, placeholder: 'Your company' },
      { name: 'name', label: 'Your name', required: true, placeholder: 'First and last name' },
      { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@company.com' },
      { name: 'phone', label: 'Phone', type: 'tel', placeholder: '(000) 000-0000' },
    ],
    fields: [
      { name: 'overview', label: 'Brief company overview', type: 'textarea', rows: 4, placeholder: 'What do you do, and who do you serve?' },
      { name: 'mission', label: 'Your mission', type: 'textarea', rows: 3, placeholder: 'Why does your business exist?' },
      { name: 'success', label: 'What would make this project successful?', type: 'textarea', rows: 3, placeholder: 'More leads, clearer positioning, online sales…' },
    ],
  },
  {
    number: '02',
    title: 'Website scope',
    intro: 'A rough idea of size and purpose—estimates are perfectly fine.',
    gridFields: [
      { name: 'pages', label: 'Estimated page count', type: 'select', options: ['1–3 pages', '4–5 pages', '6–10 pages', '10+ pages', 'Not sure yet'] },
      { name: 'goal', label: 'Primary goal', type: 'select', options: ['Build credibility', 'Generate leads', 'Sell products', 'Book appointments', 'Showcase work', 'Other'] },
    ],
    fields: [
      { name: 'offerings', label: 'Products or services', type: 'textarea', rows: 3, placeholder: 'What are you selling or promoting?' },
      { name: 'features', label: 'Pages or features you expect', type: 'textarea', rows: 3, placeholder: 'Home, About, Services, booking, shop, blog…' },
    ],
  },
  {
    number: '03',
    title: 'Brand + connections',
    intro: 'Share anything you already have—leave blank what you don’t.',
    gridFields: [
      { name: 'domain', label: 'Existing or desired domain', placeholder: 'yourcompany.com' },
      { name: 'launchDate', label: 'Desired launch date', type: 'date' },
    ],
    fields: [
      { name: 'brand', label: 'Brand direction', type: 'textarea', rows: 3, placeholder: 'Colors, tagline, visual style, or links to inspiration' },
      { name: 'assets', label: 'Available assets', type: 'textarea', rows: 3, placeholder: 'Logo, brand guide, copy, high-resolution images, video…' },
      { name: 'integrations', label: 'Social, marketing, or business platforms', type: 'textarea', rows: 3, placeholder: 'Instagram, LinkedIn, Mailchimp, HubSpot, Calendly…' },
    ],
  },
  {
    number: '04',
    title: 'Final details',
    intro: 'A few last preferences and anything else on your mind.',
    gridFields: [
      { name: 'package', label: 'Preferred starting package', type: 'select', options: ['Launch — $300+', 'Business — $750+', 'Professional — $1,500+', 'Custom — $2,500+', 'I need a recommendation'] },
      { name: 'referral', label: 'How did you hear about me?', placeholder: 'Referral, search, social…' },
    ],
    fields: [
      { name: 'notes', label: 'Anything else I should know?', type: 'textarea', rows: 4, placeholder: 'Questions, constraints, or context' },
    ],
  },
]

const isEmail = (value) => /.+@.+\..+/.test(value)

const getEasternNow = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())

  return Object.fromEntries(parts.map(({ type, value }) => [type, value]))
}

const getEasternToday = () => {
  const { year, month, day } = getEasternNow()
  return `${year}-${month}-${day}`
}

const getEasternDateOffset = (days) => {
  const today = getEasternToday()
  const date = new Date(`${today}T12:00:00`)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseDateString = (dateString) => new Date(`${dateString}T12:00:00`)

const toDateString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ConsultationCalendar({ value, min, max, onSelect, onOpenChange }) {
  const minDate = parseDateString(min)
  const maxDate = parseDateString(max)
  const initialDate = value ? parseDateString(value) : minDate
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  )
  const calendarRef = useRef(null)
  const setCalendarOpen = (open) => {
    setIsOpen(open)
    onOpenChange(open)
  }

  useEffect(() => {
    if (!isOpen) return undefined

    const closeOnOutsideClick = (event) => {
      if (!calendarRef.current?.contains(event.target)) setCalendarOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setCalendarOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const monthStart = new Date(year, month, 1)
  const gridStart = new Date(year, month, 1 - monthStart.getDay())
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
  const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
  const canGoPrevious = visibleMonth > minMonth
  const canGoNext = visibleMonth < maxMonth
  const today = getEasternToday()

  const moveMonth = (amount) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  const handleDayKeyDown = (event, dateString) => {
    const offsets = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    }
    const offset = offsets[event.key]
    if (!offset) return

    event.preventDefault()
    const nextDate = parseDateString(dateString)
    nextDate.setDate(nextDate.getDate() + offset)
    const nextString = toDateString(nextDate)
    calendarRef.current?.querySelector(`[data-date="${nextString}"]:not(:disabled)`)?.focus()
  }

  const selectedLabel = value
    ? parseDateString(value).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Choose a date'

  return (
    <div className="custom-date-picker" ref={calendarRef}>
      <button
        key={value || 'empty'}
        className={value ? 'date-picker-trigger has-value' : 'date-picker-trigger'}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setCalendarOpen(!isOpen)}
      >
        <span>
          <small>Select a date</small>
          <strong>{selectedLabel}</strong>
        </span>
        <CalendarDays size={20} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="calendar-popover" role="dialog" aria-label="Choose a consultation date">
          <div className="calendar-header">
            <div>
              <span>Available dates</span>
              <strong>
                {visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </strong>
            </div>
            <div className="calendar-nav">
              <button
                type="button"
                aria-label="Previous month"
                disabled={!canGoPrevious}
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Next month"
                disabled={!canGoNext}
                onClick={() => moveMonth(1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="calendar-weekdays" aria-hidden="true">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid" role="grid" aria-label="Calendar days">
            {days.map((date) => {
              const dateString = toDateString(date)
              const isOutsideMonth = date.getMonth() !== month
              const isDisabled = date < minDate || date > maxDate
              const isSelected = dateString === value
              const isToday = dateString === today
              const classNames = [
                'calendar-day',
                isOutsideMonth ? 'is-outside' : '',
                isSelected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
              ].filter(Boolean).join(' ')

              return (
                <button
                  className={classNames}
                  type="button"
                  role="gridcell"
                  aria-label={date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  aria-selected={isSelected}
                  disabled={isDisabled}
                  data-date={dateString}
                  onKeyDown={(event) => handleDayKeyDown(event, dateString)}
                  onClick={() => {
                    onSelect(dateString)
                    setCalendarOpen(false)
                  }}
                >
                  <span>{date.getDate()}</span>
                  {isToday && <i>Today</i>}
                </button>
              )
            })}
          </div>
          <p className="calendar-help">Choose any available date within the next 60 days.</p>
        </div>
      )}
    </div>
  )
}

const CONSULTATION_WINDOW_DAYS = 60

const formatMinutes = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${String(mins).padStart(2, '0')} ${suffix}`
}

const getConsultationSlots = (dateString) => {
  if (!dateString) return []

  const dayOfWeek = new Date(`${dateString}T12:00:00`).getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const start = isWeekend ? 11 * 60 : 10 * 60 + 30
  const end = isWeekend ? 18 * 60 : 20 * 60
  const easternNow = getEasternNow()
  const today = `${easternNow.year}-${easternNow.month}-${easternNow.day}`
  const currentMinutes = Number(easternNow.hour) * 60 + Number(easternNow.minute)

  const slots = []
  for (let minutes = start; minutes < end; minutes += 30) {
    if (dateString !== today || minutes > currentMinutes) {
      slots.push(formatMinutes(minutes))
    }
  }
  return slots
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [openService, setOpenService] = useState(null)
  const [tickerPaused, setTickerPaused] = useState(false)
  const headerRef = useRef(null)

  const openServiceFromTicker = (number) => {
    setOpenService(number)
    setTickerPaused(true)
    window.requestAnimationFrame(() => {
      document.getElementById(`service-${number}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
  const [portfolioPaused, setPortfolioPaused] = useState(false)
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [packageModalOpen, setPackageModalOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [consultation, setConsultation] = useState({
    date: '',
    time: '',
    firstName: '',
    lastName: '',
    email: '',
  })
  const [consultationDateOpen, setConsultationDateOpen] = useState(false)
  const [consultationAttempted, setConsultationAttempted] = useState(false)
  const [consultationSubmitted, setConsultationSubmitted] = useState(false)
  const portfolioRef = useRef(null)
  const modalCloseRef = useRef(null)
  const consultationErrorRef = useRef(null)

  const totalSteps = formSteps.length

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const isStepValid = (index) =>
    [...formSteps[index].gridFields, ...formSteps[index].fields].every((field) => {
      if (!field.required) return true
      const value = (formData[field.name] || '').trim()
      if (!value) return false
      if (field.type === 'email') return isEmail(value)
      return true
    })

  const goNext = () => {
    if (isStepValid(step)) setStep((current) => Math.min(current + 1, totalSteps - 1))
  }

  const goBack = () => setStep((current) => Math.max(current - 1, 0))

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!isStepValid(step)) return
    setSubmitted(true)
  }

  const renderField = (field, idPrefix = '') => {
    const fieldId = `${idPrefix}${field.name}`
    const shared = {
      name: field.name,
      id: fieldId,
      value: formData[field.name] || '',
      onChange: handleChange,
      placeholder: field.placeholder,
    }

    let control
    if (field.type === 'textarea') {
      control = <textarea rows={field.rows || 3} {...shared} />
    } else if (field.type === 'select') {
      control = (
        <select {...shared}>
          <option value="" disabled>Select one</option>
          {field.options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      )
    } else {
      control = <input type={field.type || 'text'} required={field.required} {...shared} />
    }

    return (
      <label htmlFor={fieldId} key={field.name}>
        {field.label}
        {field.required && <span className="req">*</span>}
        {control}
      </label>
    )
  }

  const renderIntakeWizard = (idPrefix) => (
    submitted ? (
      <div className="form-complete" role="status">
        <span className="form-complete-badge"><Check size={28} /></span>
        <h3>Thank you — your brief is complete.</h3>
        <p>I have everything I need to prepare for our call. Live submissions will be enabled once the backend is connected.</p>
        <p className="form-fineprint">No out-of-scope work is performed without your approval. Third-party fees are billed separately.</p>
      </div>
    ) : (
      <>
        <div className="form-progress">
          <div className="form-progress-head">
            <span>Step {step + 1} of {totalSteps}</span>
            <span>{Math.round((step / (totalSteps - 1)) * 100)}% complete</span>
          </div>
          <ol className="stepper">
            {formSteps.map((stepItem, index) => (
              <li
                key={stepItem.number}
                className={`stepper-item${index === step ? ' is-active' : ''}${index < step ? ' is-done' : ''}`}
              >
                <span className="stepper-dot">
                  {index < step ? <Check size={15} /> : stepItem.number}
                </span>
                <span className="stepper-label">{stepItem.title}</span>
              </li>
            ))}
          </ol>
          <div className="form-progress-bar">
            <span style={{ width: `${(step / (totalSteps - 1)) * 100}%` }} />
          </div>
        </div>

        <div className="form-step">
          <p className="form-step-kicker">{formSteps[step].number} · {formSteps[step].title}</p>
          <p className="form-step-intro">{formSteps[step].intro}</p>
          <div className="field-grid">
            {formSteps[step].gridFields.map((field) => renderField(field, idPrefix))}
          </div>
          {formSteps[step].fields.map((field) => renderField(field, idPrefix))}
        </div>

        <div className="form-nav">
          {step > 0 ? (
            <button type="button" className="button button--ghost" onClick={goBack}>
              <ChevronLeft size={18} /> Back
            </button>
          ) : (
            <span className="form-nav-hint">Open-ended questions are optional—skip anything that doesn’t apply.</span>
          )}
          {step < totalSteps - 1 ? (
            <button type="button" className="button button--accent" onClick={goNext} disabled={!isStepValid(step)}>
              Continue <ArrowRight size={18} />
            </button>
          ) : (
            <button type="submit" className="button button--accent" disabled={!isStepValid(step)}>
              Complete project brief <ArrowRight size={18} />
            </button>
          )}
        </div>
      </>
    )
  )

  const openPackageModal = (item) => {
    setSelectedPackage(item)
    setStep(0)
    setSubmitted(false)
    setFormData((current) => ({
      ...current,
      package: `${item.name} — ${item.price}+`,
    }))
    setPackageModalOpen(true)
  }

  const closePackageModal = () => setPackageModalOpen(false)

  const closeMenu = () => {
    setMenuOpen(false)
    setAboutOpen(false)
  }
  const consultationSlots = getConsultationSlots(consultation.date)

  useEffect(() => {
    if (!aboutOpen && !menuOpen) return undefined

    const closeOnOutsideClick = (event) => {
      if (!headerRef.current?.contains(event.target)) {
        setAboutOpen(false)
        setMenuOpen(false)
      }
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setAboutOpen(false)
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [aboutOpen, menuOpen])

  const handleConsultationChange = (event) => {
    const { name, value } = event.target

    setConsultation((current) => ({
      ...current,
      [name]: value,
      ...(name === 'date' ? { time: '' } : {}),
    }))
    setConsultationSubmitted(false)
  }

  const getConsultationErrors = () => {
    const errors = {}
    const minDate = getEasternToday()
    const maxDate = getEasternDateOffset(CONSULTATION_WINDOW_DAYS)

    if (!consultation.date) {
      errors.date = 'Choose a consultation date.'
    } else if (consultation.date < minDate || consultation.date > maxDate) {
      errors.date = `Choose a date within the next ${CONSULTATION_WINDOW_DAYS} days.`
    }
    if (!consultation.time) errors.time = 'Select an available time.'
    if (!consultation.firstName.trim()) errors.firstName = 'Enter your first name.'
    if (!consultation.lastName.trim()) errors.lastName = 'Enter your last name.'
    if (!consultation.email.trim()) {
      errors.email = 'Enter your email address.'
    } else if (!isEmail(consultation.email.trim())) {
      errors.email = 'Enter a valid email address, such as name@company.com.'
    }

    return errors
  }

  const consultationErrors = getConsultationErrors()
  const consultationIsValid = Object.keys(consultationErrors).length === 0

  const handleConsultationSubmit = (event) => {
    event.preventDefault()
    setConsultationAttempted(true)

    if (!consultationIsValid) {
      window.requestAnimationFrame(() => consultationErrorRef.current?.focus())
      return
    }

    setConsultationAttempted(false)
    setConsultationSubmitted(true)
  }

  useEffect(() => {
    if (!packageModalOpen) return undefined

    const previouslyFocused = document.activeElement
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closePackageModal()
    }

    document.body.classList.add('has-package-modal')
    document.addEventListener('keydown', handleKeyDown)
    window.requestAnimationFrame(() => modalCloseRef.current?.focus())

    return () => {
      document.body.classList.remove('has-package-modal')
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [packageModalOpen])

  useEffect(() => {
    const carousel = portfolioRef.current
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!carousel || reducedMotion || portfolioPaused) return undefined

    let frame
    let lastTime
    let position = carousel.scrollLeft

    const animate = (time) => {
      if (window.innerWidth <= 900) {
        const elapsed = lastTime ? Math.min(time - lastTime, 32) : 0
        const loopStart = carousel.querySelector('[data-loop-start="true"]')
        const loopPoint = loopStart?.offsetLeft || 0

        position += elapsed * 0.025
        if (loopPoint && position >= loopPoint) {
          position -= loopPoint
        }
        carousel.scrollLeft = position
      }

      lastTime = time
      frame = window.requestAnimationFrame(animate)
    }

    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [portfolioPaused])

  return (
    <>
      <header
        className="site-header"
        ref={headerRef}
        inert={packageModalOpen || undefined}
        aria-hidden={packageModalOpen || undefined}
      >
        <a className="wordmark" href="#top" aria-label="Cartez Dewberry home">
          C<span>/</span>D
        </a>
        <button
          className="menu-button"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((open) => !open)
            setAboutOpen(false)
          }}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className={menuOpen ? 'nav-links nav-links--open' : 'nav-links'} aria-label="Main navigation">
          <a href="#services" onClick={closeMenu}>Services</a>
          <a href="#work" onClick={closeMenu}>Work</a>
          <div className={aboutOpen ? 'nav-dropdown is-open' : 'nav-dropdown'}>
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={aboutOpen}
              onClick={() => setAboutOpen((open) => !open)}
            >
              About <ChevronDown size={14} aria-hidden="true" />
            </button>
            <div className="nav-submenu">
              <a href="#about" onClick={closeMenu}>My Bio</a>
              <a href="#faq" onClick={closeMenu}>FAQ</a>
            </div>
          </div>
          <a href="#pricing" onClick={closeMenu}>Pricing</a>
          <a className="nav-cta" href="#consultation" onClick={closeMenu}>Book a free call</a>
        </nav>
      </header>

      <main id="top" inert={packageModalOpen || undefined} aria-hidden={packageModalOpen || undefined}>
        <section className="hero-section">
          <div className="hero section-shell">
            <div className="hero-copy">
              <p className="eyebrow"><Sparkles size={15} /> Full-stack web developer for small businesses.</p>
              <h1>Websites that make small businesses feel <em>big.</em></h1>
              <p className="hero-intro">
                I design and build custom, high-performing websites, booking systems, and integrations for
                entrepreneurs and small businesses—without the agency-sized price tag.
              </p>
              <div className="hero-actions">
                <a className="button button--dark" href="#onboarding">Plan your website <ArrowRight size={18} /></a>
                <a className="text-link" href="#work">See my work <ChevronRight size={17} /></a>
                <a
                  className="text-link text-link--linkedin"
                  href="https://www.linkedin.com/in/cartez-dewberry/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Cartez Dewberry on LinkedIn"
                >
                  <Linkedin size={17} /> LinkedIn
                </a>
              </div>
              <div className="trust-row">
                <span>Custom design</span>
                <span>Full-stack build</span>
                <span>Clear pricing</span>
              </div>
            </div>
            <div
              className="hero-visual"
              role="img"
              aria-label="Illustration of a small-business website with online booking, payments, AI search visibility, and security built in"
            >
              <div className="orbit orbit--one" />
              <div className="orbit orbit--two" />
              <div className="hero-card">
                <div className="browser-bar">
                  <div className="browser-dots"><i /><i /><i /></div>
                  <span className="browser-url">yourbusiness.com</span>
                </div>
                <div className="mock-nav">
                  <b />
                  <span><i /><i /><i /></span>
                  <em>Book now</em>
                </div>
                <div className="mock-label">YOUR BUSINESS, ONLINE</div>
                <div className="mock-title">Booked. Paid. Found.</div>
                <div className="mock-line" />
                <div className="mock-line mock-line--short" />
                <div className="mock-stats">
                  <div><strong>24/7</strong><span>Online booking</span></div>
                  <div><strong>+38%</strong><span>New leads</span></div>
                  <div><strong>AI</strong><span>Search ready</span></div>
                </div>
                <div className="mock-button">BOOK A SERVICE →</div>
              </div>
              <span className="floating-note floating-note--top"><Search size={15} /> Found on Google + ChatGPT</span>
              <span className="floating-note floating-note--side"><ShieldCheck size={15} /> Secure · bots blocked</span>
              <span className="floating-note floating-note--bottom"><CreditCard size={15} /> Booking + payments built in</span>
            </div>
          </div>
        </section>

        <section className={tickerPaused ? 'ticker is-paused' : 'ticker'} aria-label="Capabilities">
          <div className="ticker-window">
            <div className="ticker-track">
              {[0, 1].map((group) => (
                <div className="ticker-group" aria-hidden={group === 1} inert={group === 1 || undefined} key={group}>
                  {tickerItems.map((item) => (
                    <React.Fragment key={item.label}>
                      <button
                        className="ticker-item"
                        type="button"
                        tabIndex={group === 1 ? -1 : 0}
                        onClick={() => openServiceFromTicker(item.service)}
                        aria-label={`${item.label}. Learn more under What I do.`}
                      >
                        {item.label}
                      </button>
                      <span className="ticker-divider" aria-hidden="true">✦</span>
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="services-section" id="services">
          <div className="services section-shell">
            <Reveal className="section-heading">
              <p className="kicker">What I do</p>
              <h2>Useful design.<br />Solid engineering.</h2>
              <img
                className="services-showcase"
                src={websiteShowcase}
                alt="Cartez Dewberry website displayed responsively on a laptop and mobile phone"
                loading="lazy"
              />
            </Reveal>
            <div className="service-list">
              {services.map((service, index) => {
                const isOpen = openService === service.number
                const detailId = `service-detail-${service.number}`
                return (
                  <Reveal
                    as="article"
                    className={isOpen ? 'service-row is-open' : 'service-row'}
                    id={`service-${service.number}`}
                    delay={Math.min(index, 4) * 0.06}
                    distance={18}
                    key={service.number}
                  >
                    <span>{service.number}</span>
                    <h3>{service.title}</h3>
                    <p>{service.copy}</p>
                    <button
                      className="service-toggle"
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={detailId}
                      aria-label={`${isOpen ? 'Hide' : 'Show'} details for ${service.title}`}
                      onClick={() => {
                        if (isOpen) {
                          setOpenService(null)
                          setTickerPaused(false)
                        } else {
                          setOpenService(service.number)
                        }
                      }}
                    >
                      <ArrowRight aria-hidden="true" />
                    </button>
                    <div className="service-detail" id={detailId} hidden={!isOpen}>
                      <p className="service-value">{service.value}</p>
                      <div className="service-detail-grid">
                        <div>
                          <p className="service-detail-label">What you get</p>
                          <ul>
                            {service.includes.map((item) => (
                              <li key={item}><Check size={15} /> {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="service-detail-label">Built before</p>
                          <p className="service-proof">{service.proof}</p>
                          <a className="text-link" href="#onboarding">Start a project <ChevronRight size={16} /></a>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        <section className="work" id="work">
          <div className="section-shell">
            <Reveal className="work-heading">
              <div>
                <p className="kicker kicker--light">Portfolio</p>
                <h2>Websites I’ve<br />built.</h2>
              </div>
              <p>
                A selection of live projects—product platforms, dashboards, and small-business marketing sites—each
                built responsive, fast, and tailored to the brand.
              </p>
            </Reveal>
            <div
              className={portfolioPaused ? 'portfolio-grid is-paused' : 'portfolio-grid'}
              ref={portfolioRef}
              onMouseEnter={() => setPortfolioPaused(true)}
              onMouseLeave={() => setPortfolioPaused(false)}
              onPointerDown={() => setPortfolioPaused(true)}
              onFocus={() => setPortfolioPaused(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setPortfolioPaused(false)
              }}
              aria-label="Portfolio projects. Auto-scroll pauses when you interact with a project."
            >
              {portfolio.map((project) => (
                <a
                  className={project.featured ? 'portfolio-card portfolio-card--featured' : 'portfolio-card'}
                  href={project.url}
                  target="_blank"
                  rel="noreferrer"
                  key={project.url}
                >
                  <div className={project.image === marcdShot ? 'portfolio-thumb portfolio-thumb--plain' : 'portfolio-thumb'}>
                    <img src={project.image} alt={`${project.title} landing page`} loading="lazy" />
                    <span className="portfolio-visit"><ExternalLink size={16} /> Visit site</span>
                  </div>
                  <div className="portfolio-info">
                    <p className="portfolio-category">{project.category}</p>
                    <h3>{project.title}</h3>
                    <span>{project.description}</span>
                  </div>
                </a>
              ))}
              {portfolio.map((project, index) => (
                <a
                  className={`${project.featured ? 'portfolio-card portfolio-card--featured' : 'portfolio-card'} portfolio-card--clone`}
                  href={project.url}
                  target="_blank"
                  rel="noreferrer"
                  key={`clone-${project.url}`}
                  data-loop-start={index === 0 ? 'true' : undefined}
                  aria-hidden="true"
                  tabIndex="-1"
                >
                  <div className={project.image === marcdShot ? 'portfolio-thumb portfolio-thumb--plain' : 'portfolio-thumb'}>
                    <img src={project.image} alt="" loading="lazy" />
                    <span className="portfolio-visit"><ExternalLink size={16} /> Visit site</span>
                  </div>
                  <div className="portfolio-info">
                    <p className="portfolio-category">{project.category}</p>
                    <h3>{project.title}</h3>
                    <span>{project.description}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about section-shell">
            <Reveal className="portrait-wrap">
              <div className="portrait-accent">BUILT<br />WITH<br />PURPOSE</div>
              <img src={headshot} alt="Cartez Dewberry, software engineer and founder" />
            </Reveal>
            <Reveal className="about-copy" delay={0.1}>
              <p className="kicker">About me</p>
              <h2>I bring a builder’s mindset to every project.</h2>
              <p className="about-lead">
                I’m Cartez Dewberry—a software engineer, founder, U.S. Marine veteran, and former owner-operator.
              </p>
              <p>
                Building Marc’d taught me how to take a meaningful idea from lived experience to a real digital
                product. I bring that same ownership, resourcefulness, and care to entrepreneurs and small businesses
                that need a strong web presence without unnecessary overhead.
              </p>
              <div className="skill-tags">
                <span>React</span><span>React Native</span><span>Django + Python</span><span>Node + Express</span>
                <span>PostgreSQL</span><span>Stripe + APIs</span><span>MCP servers</span><span>SEO + AEO</span>
                <span>AI agents</span><span>Security</span><span>UX strategy</span><span>Deployment</span>
              </div>
              <a className="linkedin-link" href="https://www.linkedin.com/in/cartez-dewberry/" target="_blank" rel="noreferrer">
                <Linkedin size={18} /> Connect on LinkedIn <ExternalLink size={15} />
              </a>
            </Reveal>
          </div>
        </section>

        <section className="pricing-section" id="pricing">
          <div className="pricing section-shell">
            <Reveal className="pricing-intro">
              <div>
                <p className="kicker">Straightforward pricing</p>
                <h2>Start where you are.<br />Build what you need.</h2>
              </div>
              <p>Every project is quoted by scope, page count, and complexity. These packages are practical starting points—not open-ended promises.</p>
            </Reveal>
            <div className="pricing-grid">
              {packages.map((item, index) => (
                <Reveal
                  as="article"
                  className={item.featured ? 'price-card price-card--featured' : 'price-card'}
                  delay={index * 0.09}
                  hover={CARD_HOVER}
                  key={item.name}
                >
                  {item.featured && <span className="popular">Most popular</span>}
                  <p className="plan-name">{item.name}</p>
                  <p className="price"><small>Starting at</small>{item.price}</p>
                  <p className="hours">{item.hours}</p>
                  <p className="package-timeline">
                    <CalendarDays size={15} aria-hidden="true" /> Estimated: {item.timeline}
                  </p>
                  <p className="plan-description">{item.description}</p>
                  <ul>
                    {item.features.map((feature) => <li key={feature}><Check size={16} /> {feature}</li>)}
                  </ul>
                  <button
                    className="button button--outline"
                    type="button"
                    onClick={() => openPackageModal(item)}
                  >
                    Choose {item.name}
                  </button>
                </Reveal>
              ))}
            </div>
            <Reveal className="custom-note" distance={18}>
              <span>Need e-commerce, authentication, APIs, or a custom dashboard?</span>
              <strong>Custom projects start at $2,500.</strong>
            </Reveal>
          </div>
        </section>

        <section className="faq-section" id="faq">
          <div className="faq section-shell">
            <Reveal className="faq-intro">
              <p className="kicker">Good to know</p>
              <h2>Questions, answered<br />in plain language.</h2>
              <p>
                Clear expectations make better projects. Timelines and prices are estimates and may change when
                the requested scope, content, integrations, or revision needs change.
              </p>
              <a className="text-link" href="#consultation">Still have a question? Book a free call <ChevronRight size={17} /></a>
            </Reveal>
            <div className="faq-list">
              {faqs.map((item, index) => (
                <Reveal
                  as="details"
                  className="faq-item"
                  delay={Math.min(index, 5) * 0.05}
                  distance={14}
                  key={item.question}
                >
                  <summary>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{item.question}</strong>
                    <ChevronDown size={19} aria-hidden="true" />
                  </summary>
                  <p>{item.answer}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="prep-section">
          <div className="prep section-shell">
            <ol className="agenda">
              {agenda.map((item, index) => (
                <Reveal as="li" delay={index * 0.07} distance={14} key={item.time}>
                  <span>{item.time}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
            <Reveal className="prep-intro">
              <p className="kicker">Before we build</p>
              <h2>A productive<br />30-minute call.</h2>
              <p className="prep-summary">
                A focused conversation with a clear purpose—so we leave knowing what to build, why it matters, and
                what happens next.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="consultation" id="consultation">
          <div className="section-shell consultation-grid">
            <Reveal className="consultation-copy">
              <p className="kicker kicker--light">Free consultation</p>
              <h2>Let’s talk about your idea.</h2>
              <p>
                Book a free 30-minute discovery call to discuss your goals, scope, timeline, and the best next step
                for your business.
              </p>
              <div className="consultation-photo">
                <img
                  src={consultationMeeting}
                  alt="Cartez discussing a website project with a client"
                  loading="lazy"
                />
              </div>
            </Reveal>

            <Reveal
              as="form"
              className="booking-card"
              delay={0.1}
              noValidate
              onSubmit={handleConsultationSubmit}
            >
              {consultationSubmitted ? (
                <div className="booking-success" role="status">
                  <span><Check size={26} /></span>
                  <h3>Your consultation request is ready.</h3>
                  <p>
                    {consultation.date} at {consultation.time} ET
                  </p>
                  <small>Live calendar confirmation will be enabled when the Railway backend is connected.</small>
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={() => {
                      setConsultationAttempted(false)
                      setConsultationSubmitted(false)
                    }}
                  >
                    Choose another time
                  </button>
                </div>
              ) : (
                <>
                  <div className="booking-heading">
                    <span><CalendarDays size={21} /></span>
                    <div>
                      <h3>Choose a date and time</h3>
                      <p>30-minute consultation · Free</p>
                    </div>
                  </div>

                  {consultationAttempted && !consultationIsValid && (
                    <div
                      className="consultation-error-summary"
                      role="alert"
                      tabIndex="-1"
                      ref={consultationErrorRef}
                    >
                      <strong>Please complete the highlighted information.</strong>
                      <ul>
                        {Object.values(consultationErrors).map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <ConsultationCalendar
                    value={consultation.date}
                    min={getEasternToday()}
                    max={getEasternDateOffset(CONSULTATION_WINDOW_DAYS)}
                    onOpenChange={setConsultationDateOpen}
                    onSelect={(date) => {
                      setConsultation((current) => ({ ...current, date, time: '' }))
                      setConsultationSubmitted(false)
                    }}
                  />
                  {consultationAttempted && consultationErrors.date && (
                    <span className="consultation-field-error" data-consultation-error>
                      {consultationErrors.date}
                    </span>
                  )}

                  {!consultationDateOpen && (
                    <div className="time-picker">
                      <p>Available times</p>
                      {!consultation.date && <span className="booking-empty">Select a date to see available times.</span>}
                      {consultation.date && consultationSlots.length === 0 && (
                        <span className="booking-empty">No remaining times today. Please choose another date.</span>
                      )}
                      <div className="time-grid">
                        {consultationSlots.map((time) => (
                          <button
                            className={consultation.time === time ? 'time-slot is-selected' : 'time-slot'}
                            type="button"
                            aria-pressed={consultation.time === time}
                            onClick={() => setConsultation((current) => ({ ...current, time }))}
                            key={time}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                      {consultationAttempted && consultationErrors.time && (
                        <span className="consultation-field-error" data-consultation-error>
                          {consultationErrors.time}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="booking-contact">
                    <div className="booking-name-row">
                      <label>
                        First name
                        <input
                          name="firstName"
                          value={consultation.firstName}
                          onChange={handleConsultationChange}
                          placeholder="First name"
                          autoComplete="given-name"
                          aria-invalid={consultationAttempted && Boolean(consultationErrors.firstName)}
                          aria-describedby={
                            consultationAttempted && consultationErrors.firstName
                              ? 'consultation-first-name-error'
                              : undefined
                          }
                          required
                        />
                        {consultationAttempted && consultationErrors.firstName && (
                          <span className="consultation-field-error" id="consultation-first-name-error">
                            {consultationErrors.firstName}
                          </span>
                        )}
                      </label>
                      <label>
                        Last name
                        <input
                          name="lastName"
                          value={consultation.lastName}
                          onChange={handleConsultationChange}
                          placeholder="Last name"
                          autoComplete="family-name"
                          aria-invalid={consultationAttempted && Boolean(consultationErrors.lastName)}
                          aria-describedby={
                            consultationAttempted && consultationErrors.lastName
                              ? 'consultation-last-name-error'
                              : undefined
                          }
                          required
                        />
                        {consultationAttempted && consultationErrors.lastName && (
                          <span className="consultation-field-error" id="consultation-last-name-error">
                            {consultationErrors.lastName}
                          </span>
                        )}
                      </label>
                    </div>
                    <label className="booking-email">
                      Email
                      <input
                        type="email"
                        name="email"
                        value={consultation.email}
                        onChange={handleConsultationChange}
                        placeholder="you@company.com"
                        autoComplete="email"
                        aria-invalid={consultationAttempted && Boolean(consultationErrors.email)}
                        aria-describedby={
                          consultationAttempted && consultationErrors.email
                            ? 'consultation-email-error'
                            : undefined
                        }
                        required
                      />
                      {consultationAttempted && consultationErrors.email && (
                        <span className="consultation-field-error" id="consultation-email-error">
                          {consultationErrors.email}
                        </span>
                      )}
                    </label>
                  </div>

                  <button
                    className="button button--accent booking-submit"
                    type="submit"
                    data-incomplete={!consultationIsValid || undefined}
                  >
                    Request consultation <ArrowRight size={18} />
                  </button>
                </>
              )}
            </Reveal>
          </div>
        </section>

        <section className="onboarding" id="onboarding">
          <div className="section-shell onboarding-grid">
            <Reveal className="form-intro">
              <p className="kicker kicker--light">Project intake</p>
              <h2>Tell me what you’re building.</h2>
              <p>Share what you know now. We’ll clarify the rest together during your discovery call.</p>
              <div className="domain-tip">
                <Search size={20} />
                <div>
                  <strong>Still need a domain?</strong>
                  <p>You can purchase one through GoDaddy, Namecheap, or Netlify. Keep the account in your name; I can help connect it.</p>
                </div>
              </div>
              <div className="domain-tip">
                <Mail size={20} />
                <div>
                  <strong>Look professional from day one.</strong>
                  <p>Consider a branded address such as info@yourcompany.com or yourname@yourcompany.com. We can discuss setup on our call.</p>
                </div>
              </div>
            </Reveal>

            <Reveal as="form" className="intake-form" delay={0.1} onSubmit={handleSubmit}>
              {renderIntakeWizard('inline-')}
            </Reveal>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="contact section-shell">
            <Reveal as="p" className="kicker" distance={14}>Ready when you are</Reveal>
            <Reveal as="h2" delay={0.08}>
              You bring the idea.<br /><em>I’ll build the experience.</em>
            </Reveal>
            <Reveal as="p" className="contact-intro" delay={0.16}>
              Have a business, brand, or idea you’re ready to put online? Let’s turn it into a clean, responsive
              website that looks professional, feels like you, and gives your visitors a reason to take action.
            </Reveal>
            <Reveal className="contact-actions" delay={0.24} distance={18}>
              <a className="button button--dark" href="#onboarding">Start a Project <ArrowRight size={18} /></a>
              <a className="button button--ghost" href="#consultation">Let’s Talk</a>
            </Reveal>
            <Reveal className="contact-secondary" delay={0.32} distance={18}>
              <p>
                <strong>Not sure exactly what you need yet? That’s okay.</strong>
                We can start with a conversation and figure out the right direction together.
              </p>
              <div className="contact-links">
                <a href="mailto:info@marc-d.com"><Mail size={20} /> info@marc-d.com</a>
                <a href="tel:+14043541272"><Phone size={20} /> 404-354-1272</a>
                <a href="https://www.linkedin.com/in/cartez-dewberry/" target="_blank" rel="noreferrer"><Linkedin size={20} /> LinkedIn</a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer inert={packageModalOpen || undefined} aria-hidden={packageModalOpen || undefined}>
        <div className="footer-brand">
          <a className="wordmark wordmark--footer" href="#top">C<span>/</span>D</a>
          <p>Custom websites for ambitious small businesses.</p>
        </div>
        <nav className="footer-nav" aria-label="Footer navigation">
          <a href="#services">Services</a>
          <a href="#work">Work</a>
          <a href="#about">My Bio</a>
          <a href="#faq">FAQ</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </nav>
        <p className="footer-copyright">© {new Date().getFullYear()} Marc-D Group LLC</p>
      </footer>

      {packageModalOpen && selectedPackage && (
        <div
          className="package-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePackageModal()
          }}
        >
          <section
            className="package-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="package-modal-title"
            aria-describedby="package-modal-description"
          >
            <header className="package-modal-header">
              <div>
                <p className="kicker">Selected package · {selectedPackage.price}+</p>
                <h2 id="package-modal-title">Start your {selectedPackage.name} project.</h2>
                <p id="package-modal-description">
                  Complete these four short steps. Your package is already selected.
                </p>
              </div>
              <button
                className="package-modal-close"
                type="button"
                aria-label="Close project intake"
                onClick={closePackageModal}
                ref={modalCloseRef}
              >
                <X size={22} />
              </button>
            </header>
            <form className="intake-form package-modal-form" onSubmit={handleSubmit}>
              {renderIntakeWizard('modal-')}
            </form>
          </section>
        </div>
      )}
    </>
  )
}

export default App
