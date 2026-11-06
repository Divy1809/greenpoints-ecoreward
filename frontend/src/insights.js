import { monthKey, prevMonthKey } from './format'

// Everything here is computed from the user's own verified posts, so it can never
// disagree with what the server recorded.
export const BADGES = [
  { id: 'starter', icon: 'leaf', name: 'Green Starter', how: 'Post your first verified activity.', target: 1, unit: 'activity', measure: (s) => s.posts },
  { id: 'explorer', icon: 'compass', name: 'Eco Explorer', how: 'Do 3 different kinds of activity.', target: 3, unit: 'kinds', measure: (s) => s.types },
  { id: 'guardian', icon: 'tree', name: 'Tree Guardian', how: 'Plant 3 trees.', target: 3, unit: 'trees', measure: (s) => s.trees },
  { id: 'protector', icon: 'globe', name: 'Planet Protector', how: 'Earn 500 points.', target: 500, unit: 'points', measure: (s) => s.points },
  { id: 'champion', icon: 'trophy', name: 'Sustainability Champion', how: 'Earn 1,000 points.', target: 1000, unit: 'points', measure: (s) => s.points },
]

export function summarize(posts, me) {
  return {
    posts: posts.length,
    types: new Set(posts.map((p) => p.type)).size,
    trees: posts.filter((p) => p.type === 'tree-planting').length,
    points: me?.points ?? posts.reduce((s, p) => s + p.points, 0),
  }
}

export function badgeStatus(stats) {
  return BADGES.map((b) => {
    const value = b.measure(stats)
    return { ...b, value, current: Math.min(value, b.target), done: value >= b.target }
  })
}

export function byActivity(posts) {
  const map = new Map()
  for (const p of posts) {
    const row = map.get(p.type) || { type: p.type, label: p.activity, count: 0, points: 0 }
    row.count += 1
    row.points += p.points
    map.set(p.type, row)
  }
  return [...map.values()].sort((a, b) => b.points - a.points)
}

export function monthsWithPosts(posts) {
  const keys = new Set(posts.map((p) => monthKey(p.createdAt)))
  keys.add(monthKey(new Date().toISOString()))
  return [...keys].sort().reverse()
}

export function monthReport(posts, key) {
  const inMonth = posts.filter((p) => monthKey(p.createdAt) === key)
  const [y, m] = key.split('-').map(Number)
  const days = new Date(y, m, 0).getDate()
  const weeks = []
  for (let start = 1; start <= days; start += 7) {
    const end = Math.min(start + 6, days)
    weeks.push({ label: start === end ? `${start}` : `${start}–${end}`, start, end, points: 0, count: 0 })
  }
  for (const p of inMonth) {
    const day = new Date(p.createdAt).getDate()
    const w = weeks[Math.min(Math.floor((day - 1) / 7), weeks.length - 1)]
    w.points += p.points
    w.count += 1
  }
  const points = inMonth.reduce((s, p) => s + p.points, 0)
  const prevPoints = posts.filter((p) => monthKey(p.createdAt) === prevMonthKey(key)).reduce((s, p) => s + p.points, 0)
  return {
    key,
    posts: inMonth,
    points,
    count: inMonth.length,
    types: new Set(inMonth.map((p) => p.type)).size,
    weeks,
    byType: byActivity(inMonth),
    prevPoints,
    change: prevPoints > 0 ? Math.round(((points - prevPoints) / prevPoints) * 100) : null,
  }
}

const safeCell = (v) => {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // stops spreadsheet apps running a caption as a formula
  return `"${s.replace(/"/g, '""')}"`
}

export function toCsv(posts) {
  const rows = [['Date', 'Activity', 'Caption', 'Points']]
  for (const p of posts) rows.push([new Date(p.createdAt).toISOString().slice(0, 10), p.activity, p.caption || '', p.points])
  return rows.map((r) => r.map(safeCell).join(',')).join('\r\n')
}

// Points per week for the last `n` weeks (weeks start on Monday), oldest first.
export function recentWeeks(posts, n = 8) {
  const mondayOf = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
    return x
  }
  const cur = mondayOf(new Date())
  const weeks = Array.from({ length: n }, (_, i) => {
    const start = new Date(cur)
    start.setDate(start.getDate() - 7 * (n - 1 - i))
    return { time: start.getTime(), label: start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), value: 0 }
  })
  for (const p of posts) {
    const w = weeks.find((x) => x.time === mondayOf(p.createdAt).getTime())
    if (w) w.value += p.points
  }
  return weeks.map(({ label, value }) => ({ label, value }))
}
