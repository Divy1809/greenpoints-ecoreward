import { api } from '../api'
import { useApi } from '../hooks'
import { useApp } from '../app-context'
import { Icon } from '../icons'
import { num } from '../format'
import { Card, CountUp, EmptyState, ErrorBox, PageHead, PostCard, Reveal, Skeleton } from '../ui'

export default function Community() {
  const { user, freshPostId } = useApp()
  const feed = useApi(() => api('/feed'), [])
  const board = useApi(() => api('/leaderboard'), [])
  const c = board.data?.community
  const posts = feed.data?.posts || []

  return (
    <>
      <PageHead title="Community" lede="Real eco-friendly activities from real people. Each photo is checked automatically before points are given.">
        <a className="btn" href={user ? '#/add' : '#/login'}><Icon name="add" size={18} /> {user ? 'Add your activity' : 'Log in to post'}</a>
      </PageHead>

      <div className="stats">
        {[
          ['Members', c?.members, 'users'],
          ['Verified activities', c?.posts, 'check'],
          ['Points earned', c?.points, 'trend'],
        ].map(([label, value, icon], i) => (
          <Card key={label} className="stat" delay={i}>
            <span className="stat-icon"><Icon name={icon} size={20} /></span>
            <div>
              <p className="stat-label">{label}</p>
              <p className="stat-num">{value === undefined ? '–' : <CountUp value={value} />}</p>
            </div>
          </Card>
        ))}
      </div>

      {feed.loading && !feed.data && <Skeleton rows={2} tall />}
      {feed.error && !feed.data && <ErrorBox message={feed.error} onRetry={feed.reload} />}
      {!feed.loading && !feed.error && posts.length === 0 && (
        <EmptyState title="Nobody has posted yet" action={<a className="btn" href={user ? '#/add' : '#/login'}>Be the first</a>}>
          Show what you did today and it will appear here once the photo passes the check.
        </EmptyState>
      )}
      {posts.length > 0 && (
        <>
          <h2 className="section-title">Latest posts <span className="muted">{num(posts.length)} shown</span></h2>
          <div className="feed">
            {posts.map((p, i) => (
              <Reveal key={p.postId} delay={(i % 3) * 70}>
                <PostCard post={p} fresh={p.postId === freshPostId} />
              </Reveal>
            ))}
          </div>
        </>
      )}
    </>
  )
}
