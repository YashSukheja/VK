import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { fetchMyReviewState, fetchReviews, submitReview, type Review } from '../data/reviews'
import { useAuth } from '../lib/auth'
import { formatDateTime } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { Stars } from './Stars'

/** Reviews of an item (all its colours), plus the form for customers who collected it. */
export function Reviews({ productIds }: { productIds: string[] }) {
  const { session } = useAuth()
  const { pathname, hash } = useLocation()
  const userId = session?.user.id
  const key = productIds.join(',')
  const list = useAsync(() => fetchReviews(productIds), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const mine = useAsync(
    () => (userId ? fetchMyReviewState(userId, productIds) : Promise.resolve({ collectedId: null, mine: null })),
    [userId, key], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const reviews = list.data ?? []
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const canReview = !!mine.data?.collectedId

  // Links like /p/123#reviews (from a booking) land here once it has loaded.
  const ready = !list.loading && !mine.loading
  useEffect(() => {
    if (ready && hash === '#reviews') document.getElementById('reviews')?.scrollIntoView({ block: 'start' })
  }, [ready, hash])

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="flex scroll-mt-20 flex-col gap-4 border-t-[1.5px] border-ink pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="reviews-title" className="m-0 font-display text-2xl font-black uppercase md:text-3xl">
          Reviews
        </h2>
        {reviews.length > 0 && (
          <span className="flex items-center gap-2 text-sm">
            <Stars value={average} />
            <span className="font-bold">{average.toFixed(1)}</span>
            <span className="text-muted">
              ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
            </span>
          </span>
        )}
      </div>

      {canReview ? (
        <ReviewForm key={mine.data!.collectedId!} productId={mine.data!.collectedId!} mine={mine.data!.mine} onSaved={() => (list.reload(), mine.reload())} />
      ) : (
        !list.loading &&
        reviews.length === 0 && (
          <p className="m-0 text-sm text-muted">
            No reviews yet. Customers who have collected this piece can review it
            {!session && (
              <>
                {' '}
                after they{' '}
                <Link to={`/login?next=${encodeURIComponent(pathname)}`} className="font-bold text-ink underline underline-offset-4">
                  log in
                </Link>
              </>
            )}
            .
          </p>
        )
      )}

      {reviews.length > 0 && (
        <ul className="m-0 flex list-none flex-col p-0">
          {reviews.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ReviewItem({ review: r }: { review: Review }) {
  return (
    <li className="flex flex-col gap-1.5 border-b border-line py-4 first:pt-0">
      <span className="flex items-center justify-between gap-3">
        <Stars value={r.rating} size={14} />
        <span className="text-xs text-muted">{formatDateTime(r.created_at)}</span>
      </span>
      {r.comment && <p className="m-0 whitespace-pre-line text-sm leading-relaxed">{r.comment}</p>}
      <span className="text-xs font-bold text-muted">{r.customer_name} · Verified buyer</span>
      {r.reply && (
        <p className="m-0 mt-1 border-l-[3px] border-ink bg-surface px-3 py-2 text-sm">
          <span className="block text-xs font-extrabold uppercase">Vrack replied</span>
          {r.reply}
        </p>
      )}
    </li>
  )
}

function ReviewForm({ productId, mine, onSaved }: { productId: string; mine: Review | null; onSaved: () => void }) {
  const [rating, setRating] = useState(mine?.rating ?? 0)
  const [comment, setComment] = useState(mine?.comment ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!rating) return setMessage({ ok: false, text: 'Tap 1 to 5 stars first.' })
    setBusy(true)
    setMessage(null)
    try {
      await submitReview(productId, rating, comment)
      setMessage({ ok: true, text: 'Thanks! Your review is up.' })
      onSaved()
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Could not save. Try again.' })
    }
    setBusy(false)
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 bg-surface p-4">
      <span className="text-sm font-extrabold">{mine ? 'Your review' : 'You bought this. How was it?'}</span>
      {mine?.is_hidden && <span className="text-xs text-muted">The store has hidden this review from the shop.</span>}
      <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
            onClick={() => setRating(n)}
            className={`size-11 text-[28px] leading-none ${n <= rating ? 'text-ink' : 'text-field'}`}
          >
            ★
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Comment (optional)
        <textarea
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Fit, fabric, condition"
          className="border-[1.5px] border-field bg-white p-3 text-[15px] font-normal outline-none focus:border-ink"
        />
      </label>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`m-0 text-sm font-bold ${message.ok ? '' : 'text-danger'}`}>
          {message.text}
        </p>
      )}
      <button type="submit" disabled={busy} className="h-12 bg-ink text-[15px] font-extrabold text-white disabled:opacity-60">
        {busy ? 'Saving…' : mine ? 'Update review' : 'Post review'}
      </button>
    </form>
  )
}
