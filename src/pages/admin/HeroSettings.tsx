import imageCompression from 'browser-image-compression'
import { useState, type ChangeEvent } from 'react'
import { Card, Notice } from '../../components/admin'
import { HERO_MODEL_PATH } from '../../data/catalog'
import { IMAGE_BUCKET, imageUrl, supabase } from '../../lib/supabase'

/** The cut-out model on the home page. The rail behind it shows the newest pieces by itself. */
export function HeroSettings() {
  const [version, setVersion] = useState(() => Date.now())
  const [hasPhoto, setHasPhoto] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMessage(null)
    setBusy(true)
    try {
      // WebP keeps the see-through background of a cut-out.
      const small = await imageCompression(file, { maxSizeMB: 0.6, maxWidthOrHeight: 1600, useWebWorker: true, fileType: 'image/webp', initialQuality: 0.85 })
      // Replace by removing then adding: an upsert needs read rights on the file list, which the shop does not give out.
      const bucket = supabase.storage.from(IMAGE_BUCKET)
      await bucket.remove([HERO_MODEL_PATH])
      const { error } = await bucket.upload(HERO_MODEL_PATH, small, { contentType: 'image/webp', cacheControl: '60' })
      if (error) throw error
      setHasPhoto(true)
      setVersion(Date.now())
      setMessage({ kind: 'ok', text: 'Home page photo saved. It can take a minute to show on phones.' })
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Upload failed. Try again.' })
    }
    setBusy(false)
  }

  async function remove() {
    setMessage(null)
    setBusy(true)
    const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([HERO_MODEL_PATH])
    setBusy(false)
    if (error) return setMessage({ kind: 'error', text: error.message })
    setHasPhoto(false)
    setMessage({ kind: 'ok', text: 'Photo removed. The home page shows only the rail now.' })
  }

  return (
    <Card title="Home page">
      <p className="m-0 text-sm text-body">
        The model photo stands in front of the clothes rail at the top of the home page. Use a PNG with the background removed, a person
        standing, full body or from the knees up. The rail shows your 4 newest pieces in stock by itself.
      </p>
      <div className="flex items-end gap-4">
        <div className="flex h-40 w-28 flex-none items-end justify-center overflow-hidden bg-surface">
          {hasPhoto ? (
            <img
              key={version}
              src={`${imageUrl(HERO_MODEL_PATH)}?v=${version}`}
              alt="Home page model photo"
              onError={() => setHasPhoto(false)}
              className="h-full w-auto object-contain"
            />
          ) : (
            <span className="p-2 pb-3 text-center text-xs text-muted">No photo yet</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label className={`flex h-12 cursor-pointer items-center justify-center bg-ink px-4 text-sm font-extrabold text-white ${busy ? 'opacity-60' : ''}`}>
            {busy ? 'Saving…' : hasPhoto ? 'Change photo' : 'Upload photo'}
            <input type="file" accept="image/png,image/webp" disabled={busy} onChange={(e) => void upload(e)} className="sr-only" />
          </label>
          {hasPhoto && (
            <button type="button" disabled={busy} onClick={() => void remove()} className="h-11 border-[1.5px] border-ink text-sm font-bold disabled:opacity-60">
              Remove photo
            </button>
          )}
        </div>
      </div>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
    </Card>
  )
}
