import { useState } from 'react'
import { confirmSignUp, resendCode, signIn, signUp } from '../auth'
import { useApp } from '../app-context'
import { Card, PageHead } from '../ui'

export default function Login({ reason }) {
  const { onLogin } = useApp()
  const [mode, setMode] = useState('login') // login | signup | confirm
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(fn) {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  function submit(e) {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (mode === 'signup') {
      run(async () => {
        await signUp(name.trim(), cleanEmail, password)
        setEmail(cleanEmail)
        setMode('confirm')
        setInfo(`We sent a verification code to ${cleanEmail}. Check your spam folder if it does not arrive.`)
      })
    } else if (mode === 'confirm') {
      run(async () => {
        await confirmSignUp(cleanEmail, code.trim())
        await signIn(cleanEmail, password)
        onLogin()
      })
    } else {
      run(async () => {
        try {
          await signIn(cleanEmail, password)
          onLogin()
        } catch (err) {
          if (err.code === 'UserNotConfirmedException') {
            await resendCode(cleanEmail)
            setEmail(cleanEmail)
            setMode('confirm')
            setInfo(`Your email is not verified yet. We sent a new code to ${cleanEmail}.`)
            return
          }
          throw err
        }
      })
    }
  }

  const title = mode === 'signup' ? 'Create your account' : mode === 'confirm' ? 'Check your email' : 'Log in'
  const cta = mode === 'signup' ? 'Create account' : mode === 'confirm' ? 'Verify and log in' : 'Log in'
  const lede = reason || 'Log in to post activities, collect points and redeem rewards.'

  return (
    <>
      <PageHead title={title} lede={mode === 'login' ? lede : undefined} />
      <Card className="narrow">
        <form onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              Your name
              <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40} autoComplete="name" />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          {mode === 'signup' && <p className="hint">Use at least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.</p>}
          {mode === 'confirm' && (
            <label>
              Verification code
              <input value={code} onChange={(e) => setCode(e.target.value)} required inputMode="numeric" autoComplete="one-time-code" />
            </label>
          )}
          {info && <p className="note" role="status">{info}</p>}
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Please wait…' : cta}</button>
        </form>
        {mode !== 'confirm' && (
          <p className="switch">
            {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
            <button type="button" className="text-btn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo('') }}>
              {mode === 'login' ? 'Create an account' : 'Log in'}
            </button>
          </p>
        )}
      </Card>
    </>
  )
}
