import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { whatsappLink } from '../lib/format'
import type { StoreSettings } from '../lib/types'
import { BagIcon, CloseIcon, MenuIcon, UserIcon } from './Icons'
import { Logo } from './Logo'

export function SiteHeader({ settings }: { settings?: StoreSettings }) {
  const { session } = useAuth()
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="flex size-11 items-center justify-center justify-self-start"
          >
            <MenuIcon size={24} />
          </button>
          <Logo />
          <div className="flex items-center gap-0.5 justify-self-end">
            <Link
              to={session ? '/account' : '/login'}
              aria-label={session ? 'My account' : 'Log in'}
              className="flex size-11 items-center justify-center"
            >
              <UserIcon size={22} />
            </Link>
            <CartButton count={count} />
          </div>
        </div>
      </header>
      {open && <SiteMenu settings={settings} loggedIn={!!session} onClose={close} />}
    </>
  )
}

/** Full-screen black menu with big links. */
function SiteMenu({ settings, loggedIn, onClose }: { settings?: StoreSettings; loggedIn: boolean; onClose: () => void }) {
  const { pathname } = useLocation()
  const [first] = useState(pathname)
  // Close when a link changes the page, or on Escape.
  useEffect(() => {
    if (pathname !== first) onClose()
  }, [pathname, first, onClose])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const wa = settings?.whatsapp_number
  const big = 'font-display text-[44px] font-black uppercase leading-none tracking-tight text-white'
  return (
    <div role="dialog" aria-modal="true" aria-label="Menu" className="menu-in fixed inset-0 z-40 flex flex-col overflow-y-auto bg-ink text-white">
      <div className="mx-auto flex h-16 w-full max-w-6xl flex-none items-center justify-between px-4">
        <Logo dark />
        <button type="button" aria-label="Close menu" onClick={onClose} className="flex size-11 items-center justify-center">
          <CloseIcon size={26} />
        </button>
      </div>
      <nav className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-5 pt-10">
        <Link to="/" onClick={onClose} className={big}>Shop</Link>
        <Link to="/cart" onClick={onClose} className={big}>Cart</Link>
        <Link to={loggedIn ? '/account' : '/login'} onClick={onClose} className={big}>
          {loggedIn ? 'My bookings' : 'Log in'}
        </Link>
      </nav>
      <div className="mx-auto flex w-full max-w-6xl flex-none flex-col gap-3 px-5 pb-[calc(32px+env(safe-area-inset-bottom))] pt-10 text-sm">
        {wa && (
          <a href={whatsappLink(wa, "Hi Vrack, I'm looking at your store.")} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">
            WhatsApp us: +91 {wa}
          </a>
        )}
        {settings?.instagram && (
          <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">
            Instagram: @{settings.instagram}
          </a>
        )}
        <p className="m-0 text-[#bdbdb8]">Book online. Pay cash or UPI at pickup or delivery.</p>
      </div>
    </div>
  )
}

export function CartButton({ count, className = '' }: { count: number; className?: string }) {
  return (
    <Link
      to="/cart"
      aria-label={count ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart'}
      data-cart-target
      className={`relative flex size-11 items-center justify-center ${className}`}
    >
      <BagIcon size={22} />
      {count > 0 && (
        <span key={count} className="pop absolute right-0 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-black text-white">
          {count}
        </span>
      )}
    </Link>
  )
}
