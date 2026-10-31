import { useState } from 'react'
import { Card, Notice } from '../../components/admin'
import { replaceWithDemoPhotos } from '../../data/admin'

/** One tap to swap every product photo for the built-in mannequin photos, for showing the shop before real photos exist. */
export function DemoPhotoSettings() {
  const [confirming, setConfirming] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function run() {
    setConfirming(false)
    setMessage(null)
    setProgress({ done: 0, total: 0 })
    try {
      const { removed, products } = await replaceWithDemoPhotos((done, total) => setProgress({ done, total }))
      setMessage({ kind: 'ok', text: `Done. ${removed} old ${removed === 1 ? 'photo' : 'photos'} removed, ${products} ${products === 1 ? 'item' : 'items'} now show the mannequin photos.` })
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong. Tap again to retry.' })
    }
    setProgress(null)
  }

  return (
    <Card title="Demo photos">
      <p className="m-0 text-sm text-body">
        Deletes every product photo and gives each item the mannequin photos instead: shirts and tops get the shirt, jeans and trousers get the
        jeans, everything else gets the full outfit. Prices, sizes and bookings stay as they are. Deleted photos can't be brought back.
      </p>
      {progress ? (
        <p className="m-0 text-sm font-bold">{progress.total ? `Adding photos to item ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : 'Removing old photos…'}</p>
      ) : confirming ? (
        <div className="flex gap-2">
          <button type="button" onClick={() => void run()} className="h-12 flex-1 bg-ink text-sm font-extrabold text-white">
            Yes, delete and replace
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="h-12 flex-1 border-[1.5px] border-ink text-sm font-bold">
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="h-12 bg-ink text-sm font-extrabold text-white">
          Use demo photos for every item
        </button>
      )}
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
    </Card>
  )
}
