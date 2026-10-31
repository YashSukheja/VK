import { useState } from 'react'
import { Link } from 'react-router'
import { Card, fieldClass, Notice } from '../../components/admin'
import { Stars } from '../../components/Stars'
import { Empty, ErrorBox, Loading } from '../../components/States'
import { fetchAllReviews, type ReviewWithProduct } from '../../data/reviews'
import { formatDateTime } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useAsync } from '../../lib/useAsync'

/** Every review, newest first. Reply to one, or hide it from the shop. */
export function AdminReviews() {
  const { data, error, loading, reload } = useAsync(fetchAllReviews, [])
  const [filter, setFilter] = useState<'all' | 'low'>('all')

  // Keep the list on screen while it refreshes after a reply, so its messages stay.
  if (loading && !data) return <Loading />
  if (error) {
    const missing = /reviews/.test(error) && /exist|schema cache/.test(error)
    return <ErrorBox message={missing ? 'Reviews need setup file 8. Run it in Supabase first.' : error} onRetry={reload} />
  }
  const reviews = data ?? []
  const shown = filter === 'low' ? reviews.filter((r) => r.rating <= 2) : reviews
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  return (
    <div className="flex flex-col gap-3 pb-6">
      <h1 className="m-0 font-display text-2xl font-black uppercase">Reviews</h1>
      {reviews.length > 0 && (
        <p className="m-0 flex items-center gap-2 text-sm">
          <Stars value={average} /> <span className="font-bold">{average.toFixed(1)}</span> average from {reviews.length}{' '}
          {reviews.length === 1 ? 'review' : 'reviews'}
        </p>
      )}
      <div role="group" aria-label="Show" className="flex gap-2">
        {(
          [
            ['all', 'All'],
            ['low', '1 and 2 stars'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`h-10 px-4 text-sm font-bold ${filter === key ? 'bg-ink text-white' : 'border-[1.5px] border-field bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <Empty>{reviews.length ? 'No low reviews. Nice.' : 'No reviews yet. Customers can review a piece once their booking is Completed.'}</Empty>
      ) : (
        shown.map((r) => <ReviewCard key={r.id} review={r} onChanged={reload} />)
      )}
    </div>
  )
}

function ReviewCard({ review: r, onChanged }: { review: ReviewWithProduct; onChanged: () => void }) {
  const [reply, setReply] = useState(r.reply ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function update(changes: Record<string, unknown>, done: string) {
    setBusy(true)
    setMessage(null)
    const { error } = await supabase.from('reviews').update(changes).eq('id', r.id)
    setBusy(false)
    if (error) return setMessage({ kind: 'error', text: error.message })
    setMessage({ kind: 'ok', text: done })
    onChanged()
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Stars value={r.rating} />
          {r.products ? (
            <Link to={`/p/${r.products.id}`} className="text-sm font-extrabold underline underline-offset-4">
              {r.products.name}
            </Link>
          ) : (
            <span className="text-sm font-extrabold">Deleted product</span>
          )}
        </div>
        {r.is_hidden && <span className="bg-ink px-2 py-1 text-[11px] font-extrabold uppercase text-white">Hidden</span>}
      </div>
      {r.comment ? <p className="m-0 whitespace-pre-line text-sm">{r.comment}</p> : <p className="m-0 text-sm text-muted">No comment, only stars.</p>}
      <span className="text-xs text-muted">
        {r.customer_name} · {formatDateTime(r.created_at)}
      </span>
      <label className="flex flex-col gap-1.5 text-sm font-extrabold">
        Your reply (shown under the review)
        <textarea rows={2} maxLength={500} value={reply} onChange={(e) => setReply(e.target.value)} className={`${fieldClass} h-auto py-2.5`} />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || reply.trim() === (r.reply ?? '')}
          onClick={() =>
            void update(reply.trim() ? { reply: reply.trim(), replied_at: new Date().toISOString() } : { reply: null, replied_at: null }, 'Reply saved.')
          }
          className="h-11 flex-1 bg-ink text-sm font-extrabold text-white disabled:opacity-40"
        >
          Save reply
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void update({ is_hidden: !r.is_hidden }, r.is_hidden ? 'Shown in the shop again.' : 'Hidden from the shop.')}
          className="h-11 flex-1 border-[1.5px] border-ink text-sm font-extrabold disabled:opacity-40"
        >
          {r.is_hidden ? 'Show in shop' : 'Hide from shop'}
        </button>
      </div>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
    </Card>
  )
}
