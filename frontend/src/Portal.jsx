import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, CalendarDays, Check, FileText, LogOut, MessageSquare, Upload, Users } from 'lucide-react'
import { apiRequest, uploadAsset } from './api'
import { useAuth } from './AuthContext'

function PortalNotice({ error, success }) {
  if (!error && !success) return null
  return <div className={error ? 'portal-notice is-error' : 'portal-notice'} role="status">{error || success}</div>
}

export function SignInPage() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  if (!loading && user) return <Navigate to="/dashboard" replace />

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setWorking(true)
    try {
      await signIn(form.email, form.password)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <AuthLayout eyebrow="Client portal" title="Welcome back.">
      <form className="auth-form" onSubmit={submit}>
        <PortalNotice error={error} />
        <label>Email<input type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        <button className="button button--accent" disabled={working}>{working ? 'Signing in…' : <>Sign In <ArrowRight size={18} /></>}</button>
        <Link className="auth-link" to="/reset-password">Forgot your password?</Link>
      </form>
    </AuthLayout>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState({ error: '', success: '' })
  const hasToken = params.has('uid') && params.has('token')

  const submit = async (event) => {
    event.preventDefault()
    setNotice({ error: '', success: '' })
    try {
      if (hasToken) {
        await apiRequest('/auth/password-reset/confirm/', {
          method: 'POST',
          body: JSON.stringify({ uid: params.get('uid'), token: params.get('token'), password }),
        })
        setNotice({ error: '', success: 'Password updated. You can now sign in.' })
      } else {
        const data = await apiRequest('/auth/password-reset/', {
          method: 'POST',
          body: JSON.stringify({ email }),
        })
        setNotice({ error: '', success: data.detail })
      }
    } catch (error) {
      setNotice({ error: error.message, success: '' })
    }
  }

  return (
    <AuthLayout eyebrow="Account recovery" title={hasToken ? 'Choose a new password.' : 'Reset your password.'}>
      <form className="auth-form" onSubmit={submit}>
        <PortalNotice {...notice} />
        {hasToken ? (
          <label>New password<input type="password" minLength="12" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        ) : (
          <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        )}
        <button className="button button--accent">{hasToken ? 'Update password' : 'Send reset link'}</button>
        <Link className="auth-link" to="/sign-in">Return to Sign In</Link>
      </form>
    </AuthLayout>
  )
}

export function AcceptInvitationPage() {
  const [params] = useSearchParams()
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name: '', last_name: '', password: '' })
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const data = await apiRequest('/auth/invitations/accept/', {
        method: 'POST',
        body: JSON.stringify({ ...form, token: params.get('token') }),
      })
      setUser(data.user)
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <AuthLayout eyebrow="Secure invitation" title="Set up your portal.">
      <form className="auth-form" onSubmit={submit}>
        <PortalNotice error={error} />
        <div className="portal-form-row">
          <label>First name<input required value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></label>
          <label>Last name<input required value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></label>
        </div>
        <label>Password<input type="password" minLength="12" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        <small>Use at least 12 characters and avoid common passwords.</small>
        <button className="button button--accent">Activate account</button>
      </form>
    </AuthLayout>
  )
}

function AuthLayout({ eyebrow, title, children }) {
  return (
    <main className="auth-page">
      <Link className="wordmark" to="/" aria-label="Home">C<span>/</span>D</Link>
      <section className="auth-card">
        <p className="kicker">{eyebrow}</p>
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <main className="portal-loading">Loading your portal…</main>
  if (!user) return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />
  return children
}

export function DashboardPage() {
  return <ProtectedRoute><PortalShell /></ProtectedRoute>
}

function PortalShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('overview')

  const leave = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="portal-app">
      <aside className="portal-sidebar">
        <Link className="wordmark wordmark--footer" to="/">C<span>/</span>D</Link>
        <div className="portal-person"><small>{user.is_admin ? 'Administrator' : 'Client portal'}</small><strong>{user.first_name || user.email}</strong></div>
        <nav>
          {['overview', 'projects', 'messages', 'appointments'].map((item) => (
            <button className={section === item ? 'is-active' : ''} key={item} onClick={() => setSection(item)}>{item}</button>
          ))}
          {user.is_admin && <button className={section === 'availability' ? 'is-active' : ''} onClick={() => setSection('availability')}>availability</button>}
        </nav>
        <button className="portal-signout" onClick={leave}><LogOut size={17} /> Sign out</button>
      </aside>
      <main className="portal-main">
        <header><div><p className="kicker">{user.is_admin ? 'Admin dashboard' : 'Project dashboard'}</p><h1>{section[0].toUpperCase() + section.slice(1)}</h1></div><Link className="button button--ghost" to="/">View website</Link></header>
        {user.is_admin ? <AdminPortal section={section} /> : <ClientPortal section={section} />}
      </main>
    </div>
  )
}

function usePortalData(path, interval = 0) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      const response = await apiRequest(path)
      setData(response.results || response)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [path])
  useEffect(() => {
    load()
    if (!interval) return undefined
    const timer = window.setInterval(load, interval)
    return () => window.clearInterval(timer)
  }, [load, interval])
  return { data: data || [], error, reload: load }
}

function AdminPortal({ section }) {
  const briefs = usePortalData('/admin/briefs/')
  const projects = usePortalData('/admin/projects/')
  const appointments = usePortalData('/appointments/')
  const conversations = usePortalData('/conversations/', 15000)
  const rules = usePortalData('/admin/availability-rules/')
  const overrides = usePortalData('/admin/availability-overrides/')

  if (section === 'projects') return <AdminProjects projects={projects} briefs={briefs} />
  if (section === 'messages') return <MessagesPanel conversations={conversations} />
  if (section === 'appointments') return <AppointmentsPanel appointments={appointments} admin />
  if (section === 'availability') return <AvailabilityPanel rules={rules} overrides={overrides} />
  return (
    <>
      <PortalNotice error={briefs.error || projects.error} />
      <div className="portal-metrics">
        <Metric icon={<FileText />} label="New submissions" value={briefs.data.filter((item) => item.status === 'new').length} />
        <Metric icon={<Users />} label="Active projects" value={projects.data.length} />
        <Metric icon={<CalendarDays />} label="Appointments" value={appointments.data.length} />
        <Metric icon={<MessageSquare />} label="Conversations" value={conversations.data.length} />
      </div>
      <BriefList briefs={briefs} projects={projects} />
    </>
  )
}

function Metric({ icon, label, value }) {
  return <article className="portal-metric"><span>{icon}</span><strong>{value}</strong><p>{label}</p></article>
}

function BriefList({ briefs, projects }) {
  const [working, setWorking] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const invite = async (brief) => {
    setWorking(brief.id)
    setError('')
    try {
      await apiRequest(`/admin/briefs/${brief.id}/invite/`, { method: 'POST', body: JSON.stringify({}) })
      setNotice(`Invitation sent to ${brief.email}.`)
      briefs.reload()
      projects?.reload()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setWorking('')
    }
  }
  return (
    <section className="portal-panel">
      <div className="portal-panel-heading"><div><p className="kicker">Project intake</p><h2>Recent submissions</h2></div></div>
      <PortalNotice success={notice} error={error || briefs.error} />
      <div className="portal-list">
        {briefs.data.map((brief) => (
          <article key={brief.id}>
            <div><strong>{brief.company}</strong><span>{brief.name} · {brief.email}</span></div>
            <span className={`status-chip status-${brief.status}`}>{brief.status}</span>
            {brief.status === 'new' && <button className="button button--accent" disabled={working === brief.id} onClick={() => invite(brief)}>Invite client</button>}
          </article>
        ))}
        {!briefs.data.length && <p className="portal-empty">No submissions yet.</p>}
      </div>
    </section>
  )
}

function AdminProjects({ projects, briefs }) {
  const statuses = ['discovery', 'planning', 'design', 'development', 'review', 'launched', 'paused']
  const updateStatus = async (project, status) => {
    await apiRequest(`/admin/projects/${project.id}/status/`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
    projects.reload()
  }
  return (
    <>
      <BriefList briefs={briefs} projects={projects} />
      <section className="portal-panel">
        <div className="portal-panel-heading"><h2>Client projects</h2></div>
        <div className="project-grid">
          {projects.data.map((project) => (
            <article className="project-card" key={project.id}>
              <p className="kicker">{project.client.company || project.client.email}</p>
              <h3>{project.name}</h3>
              <p>{project.summary || 'Add project details as the engagement develops.'}</p>
              <label>Status<select value={project.status} onChange={(event) => updateStatus(project, event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

function ClientPortal({ section }) {
  const projects = usePortalData('/projects/')
  const appointments = usePortalData('/appointments/')
  const conversations = usePortalData('/conversations/', 15000)
  if (section === 'projects') return <ClientProjects projects={projects} />
  if (section === 'messages') return <MessagesPanel conversations={conversations} />
  if (section === 'appointments') return <AppointmentsPanel appointments={appointments} projects={projects.data} />
  const active = projects.data[0]
  return (
    <>
      <PortalNotice error={projects.error} />
      <div className="portal-welcome">
        <p className="kicker">Current project</p>
        <h2>{active?.name || 'Your next project starts here.'}</h2>
        <p>{active ? `Current status: ${active.status}` : 'Your accepted projects will appear after an administrator reviews your brief.'}</p>
        <Link className="button button--accent" to="/#onboarding">Submit a new project brief <ArrowRight size={18} /></Link>
      </div>
      {active && <ProjectTimeline project={active} />}
    </>
  )
}

function ProjectTimeline({ project }) {
  const history = project.status_history || []
  return <section className="portal-panel"><h2>Project timeline</h2><ol className="project-timeline">{history.map((item) => <li key={item.id}><Check size={16} /><div><strong>{item.status}</strong><p>{item.note || 'Project status updated.'}</p></div><time>{new Date(item.created_at).toLocaleDateString()}</time></li>)}</ol>{!history.length && <p className="portal-empty">Status updates will appear here.</p>}</section>
}

function ClientProjects({ projects }) {
  const [notice, setNotice] = useState({ error: '', success: '' })
  const upload = async (project, files) => {
    try {
      for (const file of Array.from(files).slice(0, 12)) await uploadAsset({ file, group: 'project', project: project.id })
      setNotice({ error: '', success: 'Your files were uploaded securely.' })
      projects.reload()
    } catch (error) {
      setNotice({ error: error.message, success: '' })
    }
  }
  const remove = async (asset) => {
    await apiRequest(`/assets/${asset.id}/`, { method: 'DELETE' })
    projects.reload()
  }
  return <section className="portal-panel"><PortalNotice {...notice} /><div className="project-grid">{projects.data.map((project) => <article className="project-card" key={project.id}><p className="kicker">{project.status}</p><h3>{project.name}</h3><p>{project.summary}</p><ProjectTimeline project={project} /><label className="portal-upload"><Upload size={18} /> Upload additional assets<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(event) => upload(project, event.target.files)} /></label>{project.assets?.map((asset) => <div className="portal-asset" key={asset.id}><a href={asset.download_url || '#'}>{asset.original_name}</a><button type="button" onClick={() => remove(asset)}>Remove</button></div>)}</article>)}</div></section>
}

function MessagesPanel({ conversations }) {
  const [activeId, setActiveId] = useState('')
  const [body, setBody] = useState('')
  const active = conversations.data.find((item) => item.id === activeId) || conversations.data[0]
  const send = async (event) => {
    event.preventDefault()
    if (!body.trim() || !active) return
    await apiRequest(`/conversations/${active.id}/messages/`, { method: 'POST', body: JSON.stringify({ body }) })
    setBody('')
    conversations.reload()
  }
  return <section className="messages-layout"><aside>{conversations.data.map((item) => <button className={item.id === active?.id ? 'is-active' : ''} onClick={() => setActiveId(item.id)} key={item.id}>{item.subject}</button>)}</aside><div className="message-thread"><PortalNotice error={conversations.error} />{active?.messages.map((message) => <article key={message.id}><strong>{message.sender?.first_name || message.sender?.email || 'Team'}</strong><p>{message.body}</p><time>{new Date(message.created_at).toLocaleString()}</time></article>)}{!active && <p className="portal-empty">A conversation will open when your project is created.</p>}{active && <form onSubmit={send}><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message…" maxLength="5000" /><button className="button button--accent">Send message</button></form>}</div></section>
}

function AppointmentsPanel({ appointments, projects = [], admin = false }) {
  const availability = usePortalData('/public/availability/?days=30')
  const slots = useMemo(() => availability.data.flatMap((day) => day.slots), [availability.data])
  const [slot, setSlot] = useState('')
  const [project, setProject] = useState('')
  const { user } = useAuth()
  const book = async (event) => {
    event.preventDefault()
    await apiRequest('/appointments/', {
      method: 'POST',
      body: JSON.stringify({
        first_name: user.first_name || 'Client',
        last_name: user.last_name || 'Portal',
        email: user.email,
        starts_at: slot,
        project: project || null,
      }),
    })
    setSlot('')
    appointments.reload()
  }
  const cancel = async (id) => {
    await apiRequest(`/appointments/${id}/`, { method: 'DELETE' })
    appointments.reload()
  }
  const updateStatus = async (item, status) => {
    await apiRequest(`/appointments/${item.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    appointments.reload()
  }
  return <><section className="portal-panel"><h2>Scheduled appointments</h2><div className="portal-list">{appointments.data.map((item) => <article key={item.id}><div><strong>{new Date(item.starts_at).toLocaleString()}</strong><span>{item.email}</span></div>{admin ? <select value={item.status} onChange={(event) => updateStatus(item, event.target.value)}>{['pending', 'confirmed', 'completed', 'cancelled'].map((status) => <option key={status}>{status}</option>)}</select> : <span className={`status-chip status-${item.status}`}>{item.status}</span>}{!admin && item.status !== 'cancelled' && <button className="button button--ghost" onClick={() => cancel(item.id)}>Cancel</button>}</article>)}</div></section>{!admin && <section className="portal-panel"><h2>Book a new appointment</h2><form className="portal-inline-form" onSubmit={book}><label>Project<select value={project} onChange={(event) => setProject(event.target.value)}><option value="">General consultation</option>{projects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Available time<select required value={slot} onChange={(event) => setSlot(event.target.value)}><option value="">Select a date and time</option>{slots.map((value) => <option value={value} key={value}>{new Date(value).toLocaleString()}</option>)}</select></label><button className="button button--accent">Book appointment</button></form></section>}</>
}

function AvailabilityPanel({ rules, overrides }) {
  const [rule, setRule] = useState({ weekday: '0', start_time: '10:30', end_time: '20:00', slot_minutes: 30, is_active: true })
  const [override, setOverride] = useState({ date: '', is_blocked: true, note: '' })
  const createRule = async (event) => {
    event.preventDefault()
    await apiRequest('/admin/availability-rules/', { method: 'POST', body: JSON.stringify(rule) })
    rules.reload()
  }
  const createOverride = async (event) => {
    event.preventDefault()
    await apiRequest('/admin/availability-overrides/', { method: 'POST', body: JSON.stringify(override) })
    overrides.reload()
  }
  const remove = async (path, id, reload) => {
    await apiRequest(`${path}${id}/`, { method: 'DELETE' })
    reload()
  }
  return <div className="availability-grid"><section className="portal-panel"><h2>Weekly hours</h2><form className="portal-inline-form" onSubmit={createRule}><label>Day<select value={rule.weekday} onChange={(event) => setRule({ ...rule, weekday: event.target.value })}>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day, index) => <option value={index} key={day}>{day}</option>)}</select></label><label>Start<input type="time" value={rule.start_time} onChange={(event) => setRule({ ...rule, start_time: event.target.value })} /></label><label>End<input type="time" value={rule.end_time} onChange={(event) => setRule({ ...rule, end_time: event.target.value })} /></label><button className="button button--accent">Add hours</button></form><ul className="simple-list">{rules.data.map((item) => <li key={item.id}>Day {item.weekday + 1}: {item.start_time}–{item.end_time} <button onClick={() => remove('/admin/availability-rules/', item.id, rules.reload)}>Remove</button></li>)}</ul></section><section className="portal-panel"><h2>Block a date</h2><form className="portal-inline-form" onSubmit={createOverride}><label>Date<input type="date" required value={override.date} onChange={(event) => setOverride({ ...override, date: event.target.value })} /></label><label>Note<input value={override.note} onChange={(event) => setOverride({ ...override, note: event.target.value })} /></label><button className="button button--accent">Block date</button></form><ul className="simple-list">{overrides.data.map((item) => <li key={item.id}>{item.date} {item.note} <button onClick={() => remove('/admin/availability-overrides/', item.id, overrides.reload)}>Remove</button></li>)}</ul></section></div>
}

export function AppRoutes({ marketing }) {
  return marketing
}
