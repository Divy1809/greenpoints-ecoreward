import { useEffect, useRef, useState } from 'react'
import { Icon } from './icons'
import { longDate } from './format'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const CHART_COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)']

// Runs `fn(true)` on the next frame so CSS transitions have a starting state to animate from.
function useReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return ready
}

export function Card({ title, action, className = '', delay = 0, children }) {
  return (
    <section className={`card ${className}`} style={{ '--i': delay }}>
      {(title || action) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function PageHead({ title, lede, children }) {
  return (
    <header className="page-head">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {children && <div className="head-actions">{children}</div>}
    </header>
  )
}

export function CountUp({ value, format = (n) => n.toLocaleString('en-IN') }) {
  const [n, setN] = useState(() => (reducedMotion() ? value : 0))
  useEffect(() => {
    if (reducedMotion()) {
      setN(value)
      return undefined
    }
    let raf
    let start
    const tick = (t) => {
      start ??= t
      const p = Math.min(1, (t - start) / 800)
      setN(Math.round(value * (1 - (1 - p) ** 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{format(n)}</>
}

// Fades children in the first time they scroll into view.
export function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      setSeen(true)
      return undefined
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true)
        io.disconnect()
      }
    }, { rootMargin: '0px 0px -6% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal${seen ? ' in' : ''} ${className}`} style={{ '--d': `${delay}ms` }}>
      {children}
    </div>
  )
}

export function Stamp({ points, fresh }) {
  return (
    <span className={'stamp' + (fresh ? ' fresh' : '')} role="img" aria-label={`Verified, ${points} points`}>
      <span aria-hidden="true">+{points}</span>
      <small aria-hidden="true">verified</small>
    </span>
  )
}

export function Avatar({ name, size = 'md' }) {
  return (
    <span className={`avatar ${size}`} aria-hidden="true">
      {(String(name || '?').trim()[0] || '?').toUpperCase()}
    </span>
  )
}

export function Skeleton({ rows = 3, tall }) {
  return (
    <div className="skeleton-group" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={'skeleton' + (tall ? ' tall' : '')} />
      ))}
    </div>
  )
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="state error-state" role="alert">
      <p className="state-title">This could not be loaded</p>
      <p>{message}</p>
      {onRetry && <button type="button" className="btn ghost" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="state">
      <p className="state-title">{title}</p>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function Progress({ value, max, label }) {
  const ready = useReady()
  const pct = ready ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Ring({ value, max, size = 124, stroke = 11, label, children }) {
  const ready = useReady()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = ready && max ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div className="ring" style={{ width: size, height: size }} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-bg" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle className="ring-fg" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-body">{children}</div>
    </div>
  )
}

export function Donut({ items, total, centerLabel, size = 164, stroke = 24 }) {
  const ready = useReady()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const sum = items.reduce((s, i) => s + i.value, 0) || 1
  let used = 0
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={items.map((i) => `${i.label}: ${i.value}`).join(', ')}>
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="ring-bg" />
          {items.map((it, i) => {
            const len = (it.value / sum) * c
            const seg = (
              <circle key={it.label} cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" stroke={CHART_COLORS[i % 5]}
                strokeDasharray={`${ready ? Math.max(0, len - 3) : 0} ${c}`} strokeDashoffset={-used}
                transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            )
            used += len
            return seg
          })}
        </svg>
        <div className="ring-body">
          <strong>{total}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <ul className="legend">
        {items.map((it, i) => (
          <li key={it.label}>
            <i style={{ background: CHART_COLORS[i % 5] }} aria-hidden="true" />
            <span>{it.label}</span>
            <b>{it.value}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BarChart({ data }) {
  const ready = useReady()
  const max = Math.max(1, ...data.map((d) => d.value))
  const top = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0)
  return (
    <ul className="chart">
      {data.map((d, i) => (
        <li key={d.label} className={i === top && d.value > 0 ? 'top' : ''}>
          <span className="chart-val">{d.value}</span>
          <span className="chart-track"><span style={{ height: ready ? `${(d.value / max) * 100}%` : '0%' }} /></span>
          <span className="chart-lab">{d.label}</span>
        </li>
      ))}
    </ul>
  )
}

export function Medallion({ icon, done, size = 'md' }) {
  return (
    <span className={`medal ${size}${done ? ' done' : ''}`} aria-hidden="true">
      <Icon name={done ? icon : 'lock'} size={size === 'lg' ? 28 : 22} />
    </span>
  )
}

export function PostCard({ post, fresh }) {
  return (
    <article className="card post">
      <header className="post-head">
        <Avatar name={post.displayName} />
        <div>
          <p className="who">{post.displayName}</p>
          <p className="when">{longDate(post.createdAt)}</p>
        </div>
      </header>
      <div className="photo">
        <img src={post.imageUrl} alt={`${post.displayName}: ${post.activity}${post.caption ? `, ${post.caption}` : ''}`} loading="lazy" />
        <Stamp points={post.points} fresh={fresh} />
      </div>
      <div className="post-body">
        <span className="pill">{post.activity}</span>
        {post.caption && <p className="caption">{post.caption}</p>}
      </div>
    </article>
  )
}

// Native <dialog>: focus is trapped and Escape closes it without extra code.
export function Confirm({ open, title, children, confirmLabel, busy, onConfirm, onCancel }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="dialog" onCancel={(e) => { e.preventDefault(); if (!busy) onCancel() }} aria-labelledby="dlg-title">
      <h2 id="dlg-title">{title}</h2>
      <div className="dialog-body">{children}</div>
      <div className="dialog-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="btn" onClick={onConfirm} disabled={busy}>{busy ? 'Please wait…' : confirmLabel}</button>
      </div>
    </dialog>
  )
}
