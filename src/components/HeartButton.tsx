import { useLocation, useNavigate } from 'react-router'
import { useWishlist } from '../lib/wishlist'
import { HeartIcon } from './Icons'

/** Saves a piece to the wishlist. Logged-out shoppers are sent to log in first. */
export function HeartButton({ productId, name, className = '' }: { productId: string; name: string; className?: string }) {
  const { ids, toggle } = useWishlist()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const saved = ids.has(productId)

  async function onClick() {
    const ok = await toggle(productId)
    if (!ok) navigate(`/login?next=${encodeURIComponent(pathname + search)}`)
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`Save ${name} to wishlist`}
      onClick={() => void onClick()}
      className={`heart flex size-11 items-center justify-center ${saved ? 'is-saved' : ''} ${className}`}
    >
      <HeartIcon size={20} filled={saved} />
    </button>
  )
}
