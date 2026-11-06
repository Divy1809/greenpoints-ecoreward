import { API_URL } from './config'
import { getIdToken } from './auth'

export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = await getIdToken()
    if (!token) {
      const err = new Error('Please log in again.')
      err.status = 401
      throw err
    }
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(API_URL + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || data.message || 'Request failed')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}
