import { api } from '../api'
import { useApi } from '../hooks'
import { useApp } from '../app-context'
import { Icon } from '../icons'
import { firstName, longDate, num, plural } from '../format'
import { badgeStatus, byActivity, recentWeeks, summarize } from '../insights'
import { Avatar, BarChart, Card, CountUp, Donut, EmptyState, ErrorBox, PageHead, Ring, Skeleton } from '../ui'

export default function Dashboard() {
  const { user, me } = useApp()
  const mine = useApi(() => api('/my-posts', { auth: true }), [])
  const board = useApi(() => api('/leaderboard'), [])
  const posts = mine.data?.posts || []
  const stats = summarize(posts, me)
  const next = badgeStatus(stats).find((b) => !b.done)
  const kinds = byActivity(posts)
  const top = board.data?.leaderboard?.slice(0, 3) || []
  const members = board.data?.community?.members

  return (
    <>
      <PageHead title={`Welcome back, ${firstName(user?.name)}`} lede="Your points, badges and recent activity in one place.">
        <a className="btn" href="#/add"><Icon name="add" size={18} /> Add activity</a>
      </PageHead>

      <div className="dash">
        <Card className="hero span-6" delay={0}>
          <span className="hero-stamp" aria-hidden="true">verified</span>
          <p className="hero-label">Points to spend</p>
          <p className="hero-num">{me ? <CountUp value={me.balance} /> : '–'}</p>
          <dl className="hero-meta">
            <div><dt>Earned in total</dt><dd>{me ? num(me.points) : '–'}</dd></div>
            <div><dt>Activities</dt><dd>{me ? num(me.posts) : '–'}</dd></div>
          </dl>
          <a className="btn light" href="#/rewards">Browse rewards</a>
        </Card>

        <Card className="span-3" title="Next badge" delay={1}>
          {next ? (
            <div className="ring-card">
              <Ring value={next.current} max={next.target} label={`Progress to ${next.name}`}>
                <strong>{Math.round((next.current / next.target) * 100)}%</strong>
              </Ring>
              <p className="ring-title">{next.name}</p>
              <p className="muted small">{next.how}</p>
            </div>
          ) : (
            <p className="muted">All five badges earned.</p>
          )}
        </Card>

        <Card className="span-3" title="Your rank" delay={2}>
          <p className="big-num">{me?.rank ? `#${me.rank}` : '–'}</p>
          <p className="muted small">{members ? `of ${num(members)} ${plural(members, 'member', 'members')}` : 'Post to join the leaderboard.'}</p>
          <a className="link" href="#/leaderboard">View leaderboard</a>
        </Card>

        {mine.loading && !mine.data && <div className="span-12"><Skeleton rows={2} tall /></div>}
        {mine.error && !mine.data && <div className="span-12"><ErrorBox message={mine.error} onRetry={mine.reload} /></div>}

        {mine.data && posts.length === 0 && (
          <div className="span-12">
            <EmptyState title="You have not posted yet" action={<a className="btn" href="#/add">Add your first activity</a>}>
              Your first verified photo earns points and starts your badges.
            </EmptyState>
          </div>
        )}

        {posts.length > 0 && (
          <>
            <Card className="span-8" title="Points per week" delay={3}>
              <BarChart data={recentWeeks(posts, 8)} />
            </Card>
            <Card className="span-4" title="By activity" delay={4}>
              <Donut items={kinds.map((k) => ({ label: k.label, value: k.points }))} total={num(stats.points)} centerLabel="points" />
            </Card>
            <Card className="span-7" title="Recent activity" delay={5} action={<a className="link" href="#/history">View all</a>}>
              <ul className="rows">
                {posts.slice(0, 4).map((p) => (
                  <li key={p.postId} className="row">
                    <img src={p.imageUrl} alt="" loading="lazy" />
                    <div className="row-main">
                      <p className="row-title">{p.activity}</p>
                      <p className="row-date">{longDate(p.createdAt)}</p>
                    </div>
                    <span className="pill pts">+{p.points}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="span-5" title="Top members" delay={6} action={<a className="link" href="#/leaderboard">See all</a>}>
              <ol className="mini-board">
                {top.map((e) => (
                  <li key={e.userId} className={e.userId === user?.userId ? 'you' : ''}>
                    <span className="rank">{e.rank}</span>
                    <Avatar name={e.displayName} />
                    <span className="name">{e.displayName}</span>
                    <b>{num(e.points)}</b>
                  </li>
                ))}
              </ol>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
