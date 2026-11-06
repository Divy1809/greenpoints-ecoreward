// Values come from the .env file (see .env.example). Vite only exposes VITE_* variables.
export const REGION = import.meta.env.VITE_REGION || ''
export const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || ''
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const CONFIGURED = Boolean(REGION && CLIENT_ID && API_URL)
