import { useState } from 'react'
import { api } from '../api'
import { useApi } from '../hooks'
import { useApp } from '../app-context'
import { Icon } from '../icons'
import { longDate, num } from '../format'
import { badgeStatus, summarize } from '../insights'
import { Card, Confirm, ErrorBox, Medallion, PageHead, Progress, Skeleton } from '../ui'

export default function Rewards() {
  const { user, me, refreshMe, toast } = useApp()
  const rewards = useApi(() => api('/rewards'), [])
  const mine = useApi(() => (user ? api('/my-posts', { auth: true }) : Promise.resolve({ posts: [] })), [user?.userId])
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const stats = summarize(mine.data?.posts || [], me)
  const badges = badgeStatus(stats)
  const earned = badges.filter((b) => b.done).length
  const balance = me?.balance ?? 0

  async function redeem() {
    setBusy(true)
    setError('')
    try {
      const res = await api('/rewards/redeem', { method: 'POST', auth: true, body: { rewardId: target.id } })
      await refreshMe()
      toast(`${res.redemption.title} redeemed. Your code is ${res.redemption.code}.`)
      setTarget(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function copy(code) {
    try {
      await navigator.clipboard.writeText(code)
      toast('Code copied.')
    } catch {
      toast(`Copy this code: ${code}`)
    }
  }

  return (
    <>
      <PageHead
        title="Badges and rewards"
        lede={user ? `${earned} of ${badges.length} badges earned. You have ${num(balance)} points to spend.` : 'Earn badges as you post, and spend points on rewards.'}
      />

      <h2 className="section-title">Badges</h2>
      {!user && <p className="muted">Log in to see your progress.</p>}
      <ul className="badges">
        {badges.map((b, i) => (
          <li key={b.id}>
            <Card className={'badge' + (b.done ? ' earned' : '')} delay={i}>
              <Medallion icon={b.icon} done={b.done} size="lg" />
              <p className="badge-name">{b.name} {b.done && <span className="sr-only">(earned)</span>}</p>
              <p className="muted small">{b.how}</p>
              {user && !b.done && (
                <>
                  <Progress value={b.current} max={b.target} label={`Progress to ${b.name}`} />
                  <p className="small muted">{num(b.current)} of {num(b.target)} {b.unit}</p>
                </>
              )}
              {b.done && <span className="pill pts">Earned</span>}
            </Card>
          </li>
        ))}
      </ul>

      <h2 className="section-title">Rewards</h2>
      <p className="note">This is a demo catalogue. Redeeming spends your points and gives you a code, but no real item is shipped.</p>
      {rewards.loading && !rewards.data && <Skeleton rows={3} />}
      {rewards.error && !rewards.data && <ErrorBox message={rewards.error} onRetry={rewards.reload} />}
      <ul className="rewards">
        {(rewards.data?.rewards || []).map((r, i) => {
          const short = r.cost - balance
          return (
            <li key={r.id}>
              <Card className="reward" delay={i}>
                <span className="pill">{num(r.cost)} points</span>
                <p className="reward-name">{r.title}</p>
                <p className="muted small">{r.description}</p>
                {user ? (
                  <button type="button" className="btn" disabled={short > 0} onClick={() => { setError(''); setTarget(r) }}>
                    {short > 0 ? `Need ${num(short)} more` : 'Redeem'}
                  </button>
                ) : (
                  <a className="btn ghost" href="#/login">Log in to redeem</a>
                )}
              </Card>
            </li>
          )
        })}
      </ul>

      {me?.redemptions?.length > 0 && (
        <Card title="Your redemptions">
          <ul className="rows">
            {[...me.redemptions].reverse().map((r) => (
              <li key={r.code} className="row plain">
                <div className="row-main">
                  <p className="row-title">{r.title}</p>
                  <p className="row-date">{longDate(r.at)}, {num(r.cost)} points</p>
                </div>
                <code className="code">{r.code}</code>
                <button type="button" className="icon-btn" onClick={() => copy(r.code)} aria-label={`Copy code ${r.code}`}>
                  <Icon name="copy" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Confirm
        open={Boolean(target)}
        title={target ? `Redeem ${target.title}?` : ''}
        confirmLabel="Redeem"
        busy={busy}
        onConfirm={redeem}
        onCancel={() => !busy && setTarget(null)}
      >
        {target && (
          <>
            <p>This spends <strong>{num(target.cost)} points</strong>. You will have <strong>{num(balance - target.cost)}</strong> left. Your rank and badges are not affected.</p>
            {error && <p className="error" role="alert">{error}</p>}
          </>
        )}
      </Confirm>
    </>
  )
}
