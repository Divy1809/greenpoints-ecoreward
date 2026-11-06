import { useEffect, useState } from 'react'

export const ROUTES = [
  { path: '/', title: 'Community', icon: 'community', public: true },
  { path: '/dashboard', title: 'Dashboard', icon: 'dashboard' },
  { path: '/add', title: 'Add activity', icon: 'add' },
  { path: '/history', title: 'Activity history', icon: 'history' },
  { path: '/leaderboard', title: 'Leaderboard', icon: 'trophy', public: true },
  { path: '/rewards', title: 'Badges & rewards', icon: 'award', public: true },
  { path: '/reports', title: 'Monthly reports', icon: 'chart' },
]

const read = () => {
  const p = window.location.hash.replace(/^#/, '') || '/'
  return p.startsWith('/') ? p : '/'
}

export function useRoute() {
  const [path, setPath] = useState(read)
  useEffect(() => {
    const on = () => setPath(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return path
}

export const go = (path) => {
  window.location.hash = path
}
