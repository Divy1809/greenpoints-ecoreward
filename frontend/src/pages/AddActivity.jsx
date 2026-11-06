import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { uploadPhoto } from '../photo'
import { useApp } from '../app-context'
import { Icon } from '../icons'
import { num } from '../format'
import { Card, PageHead, Stamp } from '../ui'

export default function AddActivity() {
  const { catalog, me, onPosted } = useApp()
  const types = Object.entries(catalog)
  const [type, setType] = useState('')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [seen, setSeen] = useState([])
  const [done, setDone] = useState(null)
  const fileRef = useRef(null)
  const selected = type || types[0]?.[0] || ''

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  function pickFile(e) {
    const f = e.target.files[0]
    setFile(f || null)
    setPreview(f ? URL.createObjectURL(f) : '')
    setError('')
    setSeen([])
  }

  async function submit(e) {
    e.preventDefault()
    if (!file) {
      setError('Add a photo of what you did.')
      return
    }
    setBusy(true)
    setError('')
    setSeen([])
    try {
      const key = await uploadPhoto(file)
      const res = await api('/posts', { method: 'POST', auth: true, body: { key, type: selected, caption } })
      setDone(res)
      setCaption('')
      setFile(null)
      setPreview('')
      onPosted(res.post.postId)
    } catch (err) {
      setError(err.message)
      setSeen(err.data?.seenLabels || [])
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <>
        <PageHead title="Verified" lede="The photo matched the activity, so the points are yours." />
        <Card className="result" aria-live="polite">
          <Stamp points={done.pointsEarned} fresh />
          <p className="result-line">
            You earned <strong>{done.pointsEarned} points</strong> for {done.post.activity.toLowerCase()}. Your total is now <strong>{num(done.totalPoints)}</strong>.
          </p>
          <div className="actions">
            <button type="button" className="btn" onClick={() => setDone(null)}>Add another</button>
            <a className="btn ghost" href="#/history">See your history</a>
            <a className="btn ghost" href="#/">View in community</a>
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHead title="Add an eco activity" lede="Pick what you did, add a photo, and the check runs as soon as you post." />
      <form className="add-grid" onSubmit={submit}>
        <Card title="What did you do?" delay={0}>
          <fieldset>
            <legend className="sr-only">Activity type</legend>
            <div className="choices">
              {types.map(([id, a]) => (
                <label key={id} className={'choice' + (id === selected ? ' on' : '')}>
                  <input type="radio" name="type" value={id} checked={id === selected} onChange={() => setType(id)} />
                  <span className="choice-name">{a.label}</span>
                  <span className="pill pts">{a.points} points</span>
                  <span className="choice-hint">{a.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card title="Your photo" delay={1} className="upload">
          <label className="drop">
            <span className="drop-title"><Icon name="camera" /> {file ? 'Change photo' : 'Choose a photo'}</span>
            <span className="hint">JPEG or PNG from your camera or gallery. It is resized before upload.</span>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} />
          </label>
          {preview && <img className="preview" src={preview} alt="The photo you chose" />}
          <label>
            <span>Say something about it <span className="optional">(optional)</span></span>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={140} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          {seen.length > 0 && <p className="hint">What the check found in the photo: {seen.join(', ')}.</p>}
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Uploading and checking the photo…' : 'Post and verify'}</button>
          {me && <p className="hint">Points are given only if the photo shows the activity you picked. The caption is not checked.</p>}
        </Card>
      </form>
    </>
  )
}
