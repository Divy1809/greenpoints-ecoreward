import { useState } from 'react'
import { api } from '../api'
import { useApi } from '../hooks'
import { Icon } from '../icons'
import { longDate, monthLabel, num, plural } from '../format'
import { monthReport, monthsWithPosts, toCsv } from '../insights'
import { BarChart, Card, CountUp, Donut, EmptyState, ErrorBox, PageHead, Skeleton } from '../ui'

const FLOW = [
  ['Amazon Cognito', 'logs you in and gives your browser a signed token.'],
  ['Your browser and Amazon S3:', 'the photo is resized, then sent straight to a private bucket with a short-lived link.'],
  ['API Gateway', 'accepts your post request only if the token is valid.'],
  ['AWS Lambda', 'runs the app logic and decides the points. The browser never sets them.'],
  ['Amazon Rekognition', 'looks at the photo and returns labels such as Plant or Garbage.'],
  ['Amazon DynamoDB', 'stores the post and your points together, in one transaction.'],
]

export default function Reports() {
  const { data, error, loading, reload } = useApi(() => api('/my-posts', { auth: true }), [])
  const posts = data?.posts || []
  const months = monthsWithPosts(posts)
  const [picked, setPicked] = useState('')
  const key = picked || months[0]
  const r = data ? monthReport(posts, key) : null
  const maxWeek = r ? Math.max(1, ...r.weeks.map((w) => w.points)) : 1
  const maxType = r ? Math.max(1, ...r.byType.map((t) => t.points)) : 1

  function download() {
    const blob = new Blob([toCsv(r.posts)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `greenpoints-${key}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <PageHead title="Monthly report" lede="A month of your activity, week by week.">
        {data && (
          <label className="inline-field">
            Month
            <select value={key} onChange={(e) => setPicked(e.target.value)}>
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </label>
        )}
      </PageHead>

      {loading && !data && <Skeleton rows={4} />}
      {error && !data && <ErrorBox message={error} onRetry={reload} />}

      {r && r.count === 0 && (
        <EmptyState title={`No activity in ${monthLabel(key)}`} action={<a className="btn" href="#/add">Add an activity</a>}>
          Pick another month, or post something to start this one.
        </EmptyState>
      )}

      {r && r.count > 0 && (
        <>
          <div className="stats four">
            <Card className="stat" delay={0}><div><p className="stat-label">Points earned</p><p className="stat-num"><CountUp value={r.points} /></p></div></Card>
            <Card className="stat" delay={1}><div><p className="stat-label">Activities</p><p className="stat-num"><CountUp value={r.count} /></p></div></Card>
            <Card className="stat" delay={2}><div><p className="stat-label">Kinds of activity</p><p className="stat-num"><CountUp value={r.types} /></p></div></Card>
            <Card className="stat" delay={3}>
              <div>
                <p className="stat-label">Compared with last month</p>
                <p className="stat-num">{r.change === null ? '–' : `${r.change > 0 ? '+' : ''}${r.change}%`}</p>
              </div>
            </Card>
          </div>

          <div className="dash">
            <Card className="span-8" title="Points by week" delay={4}>
              <BarChart data={r.weeks.map((w) => ({ label: `Days ${w.label}`, value: w.points }))} />
            </Card>
            <Card className="span-4" title="By activity" delay={5}>
              <Donut items={r.byType.map((t) => ({ label: t.label, value: t.points }))} total={num(r.points)} centerLabel="points" />
            </Card>
            <Card className="span-12" title="Activity log" delay={6} action={<button type="button" className="btn ghost" onClick={download}><Icon name="download" size={18} /> Download CSV</button>}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th scope="col">Date</th><th scope="col">Activity</th><th scope="col">Caption</th><th scope="col" className="num">Points</th></tr>
                  </thead>
                  <tbody>
                    {r.posts.map((p) => (
                      <tr key={p.postId}>
                        <td>{longDate(p.createdAt)}</td>
                        <td>{p.activity}</td>
                        <td>{p.caption || '–'}</td>
                        <td className="num">{p.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      <details className="how card">
        <summary>How a photo becomes points</summary>
        <ol>
          {FLOW.map(([name, text]) => (
            <li key={name}><strong>{name}</strong> {text}</li>
          ))}
        </ol>
        <p className="muted">This website itself is delivered by Amazon CloudFront from a private S3 bucket.</p>
      </details>
    </>
  )
}
