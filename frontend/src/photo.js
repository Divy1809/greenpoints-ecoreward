import { api } from './api'

const MAX_SIDE = 1600

// Re-encodes any image the browser can read as a JPEG (Rekognition only accepts
// JPEG and PNG) and shrinks it so uploads are small and fast.
export async function toJpegBlob(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Could not read this image. Please choose a JPEG or PNG photo.')
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error('Could not process this image.')
  return blob
}

// Gets a short-lived upload link from the API, then sends the photo straight to S3.
export async function uploadPhoto(file) {
  const blob = await toJpegBlob(file)
  const { uploadUrl, key } = await api('/upload-url', { method: 'POST', auth: true, body: { contentType: 'image/jpeg' } })
  const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob })
  if (!put.ok) throw new Error('Photo upload failed. Please try again.')
  return key
}
