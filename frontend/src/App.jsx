import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { CONFIGURED } from './config'
import { currentUser, signOut } from './auth'
import { AppContext } from './app-context'
import { ROUTES, go, useRoute } from './router'
import { Icon } from './icons'
import { Avatar } from './ui'
import { num } from './format'
import Community from './pages/Community'
import Dashboard from './pages/Dashboard'
import AddActivity from './pages/AddActivity'
import History from './pages/History'
import Leaderboard from './pages/Leaderboard'
import Rewards from './pages/Rewards'
import Reports from './pages/Reports'
import Login from './pages/Login'

// Apply the saved theme before the first render so there is no flash.
try {
  const saved = localStorage.getItem('gp-theme')
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved
} catch {
  /* storage can be blocked; the system theme is used then */
}

const PAGES = {
  '/': Community,
  '/dashboard': Dashboard,
  '/add': AddActivity,
  '/history': History,
  '/leaderboard': Leaderboard,
  '/rewards': Rewards,
  '/reports': Reports,
  '/login': Login,
}

function activeTheme() {
  const set = document.documentElement.dataset.theme
  if (set) return set
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(activeTheme)
  const next = theme === 'dark' ? 'light' : 'dark'
  function flip() {
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('gp-theme', next)
    } catch {
      /* ignore */
    }
    setTheme(next)
  }
  return (
    <button type="button" className={`icon-btn ${className}`} onClick={flip} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}

export default function App() {
  const route = useRoute()
  const [user, setUser] = useState(currentUser())
  const [me, setMe] = useState(null)
  const [catalog, setCatalog] = useState({})
  const [drawer, setDrawer] = useState(false)
  const [message, setMessage] = useState('')
  const [freshPostId, setFreshPostId] = useState('')
  const toastTimer = useRef(0)
  const firstRoute = useRef(true)

  const toast = useCallback((text) => {
    setMessage(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setMessage(''), 6000)
  }, [])

  const logout = useCallback(() => {
    signOut()
    setUser(null)
    setMe(null)
    setDrawer(false)
    go('/')
  }, [])

  const refreshMe = useCallback(async () => {
    if (!currentUser()) return
    try {
      setMe(await api('/me', { auth: true }))
    } catch (e) {
      if (e.status === 401) logout()
    }
  }, [logout])

  useEffect(() => {
    if (!CONFIGURED) return
    api('/activity-types').then(setCatalog).catch(() => {})
  }, [])

  useEffect(() => {
    if (CONFIGURED && user) refreshMe()
  }, [user, refreshMe])

  const page = PAGES[route] ? route : '/'
  const meta = ROUTES.find((r) => r.path === page)
  const needsLogin = Boolean(meta && !meta.public && !user)

  useEffect(() => {
    if (page === '/login' && user) go('/dashboard')
  }, [page, user])

  // Move focus to the new page's heading so keyboard and screen-reader users know the page changed.
  useEffect(() => {
    document.title = `${meta ? meta.title : page === '/login' ? 'Log in' : 'GreenPoints'} · GreenPoints`
    setDrawer(false)
    if (firstRoute.current) {
      firstRoute.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.querySelector('#main h1')?.focus({ preventScroll: true })
  }, [page, meta, needsLogin])

  useEffect(() => {
    if (!drawer) return undefined
    const onKey = (e) => e.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  const ctx = {
    user,
    me,
    catalog,
    freshPostId,
    toast,
    refreshMe,
    onLogin: () => setUser(currentUser()),
    onPosted: (id) => {
      setFreshPostId(id)
      refreshMe()
    },
  }

  if (!CONFIGURED) {
    return (
      <main className="setup">
        <h1>Setup needed</h1>
        <p>Create a <code>.env</code> file next to <code>package.json</code> with VITE_REGION, VITE_CLIENT_ID and VITE_API_URL (see <code>.env.example</code>), then rebuild.</p>
      </main>
    )
  }

  const Page = needsLogin ? Login : PAGES[page]
  const pageProps = needsLogin ? { reason: `Log in to see ${meta.title.toLowerCase()}.` } : {}

  return (
    <AppContext.Provider value={ctx}>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.querySelector('#main h1')?.focus() }}>Skip to content</a>

      <header className="topbar">
        <button type="button" className="icon-btn" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} aria-controls="sidebar">
          <Icon name="menu" />
        </button>
        <a className="wordmark" href="#/" aria-label="GreenPoints home">GreenPoints</a>
        <ThemeToggle />
      </header>

      {drawer && <button type="button" className="scrim" aria-label="Close menu" onClick={() => setDrawer(false)} />}

      <aside id="sidebar" className={'side' + (drawer ? ' open' : '')}>
        <div className="side-top">
          <a className="wordmark" href="#/" aria-label="GreenPoints home"><span className="mark" aria-hidden="true" />GreenPoints</a>
          <button type="button" className="icon-btn close" onClick={() => setDrawer(false)} aria-label="Close menu">
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="Main">
          <ul>
            {ROUTES.map((r) => (
              <li key={r.path}>
                <a href={`#${r.path}`} aria-current={r.path === page ? 'page' : undefined}>
                  <Icon name={r.icon} /> {r.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="side-foot">
          {user ? (
            <>
              <div className="side-card">
                <p>Points to spend</p>
                <strong>{me ? num(me.balance) : '–'}</strong>
                <a href="#/rewards">See rewards</a>
              </div>
              <button type="button" className="side-link" onClick={logout}>
                <Icon name="logout" size={18} /> Log out
              </button>
            </>
          ) : (
            <a className="btn" href="#/login">Log in or sign up</a>
          )}
        </div>
      </aside>

      <main id="main" className="main">
        <div className="toolbar">
          <ThemeToggle />
          {user ? (
            <span className="chip-user">
              <Avatar name={user.name} size="sm" />
              {user.name}
            </span>
          ) : (
            <a className="btn" href="#/login">Log in</a>
          )}
        </div>
        <div className="page" key={needsLogin ? 'login' : page}>
          <Page {...pageProps} />
        </div>
      </main>

      <div className="toast" role="status" aria-live="polite">{message}</div>
    </AppContext.Provider>
  )
}
