import { useState } from 'react'
import { api } from '../api'
import { useApi } from '../hooks'
import { longDate, num, plural } from '../format'
import { byActivity } from '../insights'
import { Card, EmptyState, ErrorBox, PageHead, Skeleton } from '../ui'

export default function History() {
  const { data, error, loading, reload } = useApi(() => api('/my-posts', { auth: true }), [])
  const [filter, setFilter] = useState('all')
  const posts = data?.posts || []
  const kinds = byActivity(posts)
  const shown = filter === 'all' ? posts : posts.filter((p) => p.type === filter)
  const total = shown.reduce((s, p) => s + p.points, 0)

  return (
    <>
      <PageHead
        title="Activity history"
        lede={data ? `${posts.length} verified ${plural(posts.length, 'activity', 'activities')} so far.` : 'Everything you have posted and verified.'}
      />
      {loading && !data && <Skeleton rows={4} />}
      {error && !data && <ErrorBox message={error} onRetry={reload} />}
      {data && posts.length === 0 && (
        <EmptyState title="Nothing here yet" action={<a className="btn" href="#/add">Add your first activity</a>}>
          Verified activities show up here with their photo and points.
        </EmptyState>
      )}
      {posts.length > 0 && (
        <Card>
          <div className="chips" role="group" aria-label="Filter by activity">
            <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All ({posts.length})</button>
            {kinds.map((k) => (
              <button key={k.type} type="button" className="chip" aria-pressed={filter === k.type} onClick={() => setFilter(k.type)}>
                {k.label} ({k.count})
              </button>
            ))}
          </div>
          <p className="tally" aria-live="polite">{shown.length} {plural(shown.length, 'activity', 'activities')}, {num(total)} points</p>
          <ul className="rows">
            {shown.map((p) => (
              <li key={p.postId} className="row">
                <img src={p.imageUrl} alt={`Photo for ${p.activity}`} loading="lazy" />
                <div className="row-main">
                  <p className="row-title">{p.activity}</p>
                  {p.caption && <p className="row-sub">{p.caption}</p>}
                  <p className="row-date">{longDate(p.createdAt)}</p>
                </div>
                <span className="pill pts">+{p.points}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
