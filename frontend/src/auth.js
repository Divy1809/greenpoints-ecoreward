import { REGION, CLIENT_ID } from './config'

// Talks to Amazon Cognito's public API directly, so no extra npm package is needed.
const STORE_KEY = 'greenpoints-session'

const FRIENDLY = {
  UsernameExistsException: 'An account with this email already exists. Try logging in.',
  CodeMismatchException: 'That code is not correct.',
  ExpiredCodeException: 'That code has expired. Request a new one.',
  NotAuthorizedException: 'Wrong email or password.',
  UserNotFoundException: 'Wrong email or password.',
  LimitExceededException: 'Too many attempts. Please wait a bit and try again.',
  TooManyRequestsException: 'Too many attempts. Please wait a bit and try again.',
}

async function cognito(target, payload) {
  const res = await fetch(`https://cognito-idp.${REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const code = String(data.__type || '').split('#').pop()
    const err = new Error(FRIENDLY[code] || data.message || 'Something went wrong. Please try again.')
    err.code = code
    throw err
  }
  return data
}

function decode(token) {
  const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(part), (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
  } catch {
    return null
  }
}

function saveResult(result, previousRefreshToken) {
  const session = {
    idToken: result.IdToken,
    refreshToken: result.RefreshToken || previousRefreshToken,
    expiresAt: Date.now() + (result.ExpiresIn || 3600) * 1000,
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(session))
  return session
}

export function currentUser() {
  const s = readSession()
  if (!s?.idToken) return null
  try {
    const c = decode(s.idToken)
    return { userId: c.sub, name: c.name || c.email, email: c.email }
  } catch {
    return null
  }
}

export async function getIdToken() {
  const s = readSession()
  if (!s?.idToken) return null
  if (s.expiresAt - Date.now() > 60000) return s.idToken
  if (!s.refreshToken) return null
  try {
    const data = await cognito('InitiateAuth', {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { REFRESH_TOKEN: s.refreshToken },
    })
    return saveResult(data.AuthenticationResult, s.refreshToken).idToken
  } catch {
    signOut()
    return null
  }
}

export async function signUp(name, email, password) {
  await cognito('SignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
    ],
  })
}

export async function confirmSignUp(email, code) {
  await cognito('ConfirmSignUp', { ClientId: CLIENT_ID, Username: email, ConfirmationCode: code })
}

export async function resendCode(email) {
  await cognito('ResendConfirmationCode', { ClientId: CLIENT_ID, Username: email })
}

export async function signIn(email, password) {
  const data = await cognito('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  })
  saveResult(data.AuthenticationResult)
}

export function signOut() {
  localStorage.removeItem(STORE_KEY)
}
