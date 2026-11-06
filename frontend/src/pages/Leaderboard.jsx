import { api } from '../api'
import { useApi } from '../hooks'
import { useApp } from '../app-context'
import { num, plural } from '../format'
import { Avatar, Card, CountUp, EmptyState, ErrorBox, PageHead, Skeleton } from '../ui'

export default function Leaderboard() {
  const { user, me } = useApp()
  const { data, error, loading, reload } = useApi(() => api('/leaderboard'), [])
  const list = data?.leaderboard || []
  const c = data?.community
  const podium = list.slice(0, 3)
  const rest = list.slice(3)
  const youBelow = me?.rank && me.rank > list.length

  return (
    <>
      <PageHead
        title="Leaderboard"
        lede={c ? `${num(c.members)} ${plural(c.members, 'member', 'members')} have earned ${num(c.points)} points together.` : 'The ten people with the most points.'}
      />
      {loading && !data && <Skeleton rows={3} tall />}
      {error && !data && <ErrorBox message={error} onRetry={reload} />}
      {data && list.length === 0 && <EmptyState title="No one is ranked yet">Points appear here after the first verified post.</EmptyState>}

      {podium.length > 0 && (
        <div className="podium">
          {podium.map((e, i) => {
            const you = user && e.userId === user.userId
            return (
              <Card key={e.userId} className={`pod pod-${e.rank}${you ? ' you' : ''}`} delay={i}>
                <span className="pod-rank">{e.rank}</span>
                <Avatar name={e.displayName} size="lg" />
                <p className="pod-name">{e.displayName}{you && <span className="you-tag"> (you)</span>}</p>
                <p className="pod-pts"><CountUp value={e.points} /><small> pts</small></p>
                <p className="muted small">{e.posts} {plural(e.posts, 'activity', 'activities')}</p>
              </Card>
            )
          })}
        </div>
      )}

      {rest.length > 0 && (
        <Card title="Rest of the top ten" delay={3}>
          <ol className="board">
            {rest.map((e) => {
              const you = user && e.userId === user.userId
              return (
                <li key={e.userId} className={you ? 'you' : ''}>
                  <span className="rank">{e.rank}</span>
                  <Avatar name={e.displayName} />
                  <span className="name">
                    {e.displayName}{you && <span className="you-tag"> (you)</span>}
                    <span className="sub">{e.posts} {plural(e.posts, 'activity', 'activities')}</span>
                  </span>
                  <span className="pts">{num(e.points)}<small> pts</small></span>
                </li>
              )
            })}
          </ol>
        </Card>
      )}
      {youBelow && <p className="you-below">You are ranked <strong>#{me.rank}</strong> with <strong>{num(me.points)}</strong> points.</p>}
      {!user && list.length > 0 && <p className="you-below"><a className="link" href="#/login">Log in</a> to see where you stand.</p>}
    </>
  )
}
