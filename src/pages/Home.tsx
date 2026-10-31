import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { DropBanner } from '../components/DropBanner'
import { ArrowRightIcon } from '../components/Icons'
import { ProductCard } from '../components/ProductCard'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { ProductGridSkeleton } from '../components/Skeletons'
import { ErrorBox } from '../components/States'
import { fetchCategories, fetchProducts, fetchSettings, HERO_MODEL_PATH } from '../data/catalog'
import { coloursByGroup, groupKey } from '../lib/colours'
import { sortedImages, totalStock } from '../lib/format'
import { imageUrl, thumbUrl } from '../lib/supabase'
import type { Product } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { useTitle } from '../lib/useTitle'

const NEW_IN = 6
const RAIL = 4

export function Home() {
  const { search } = useLocation()
  useTitle(null)
  const catalog = useAsync(() => Promise.all([fetchCategories(), fetchProducts()]), [])
  const settings = useAsync(fetchSettings, [])
  const [categories, products] = catalog.data ?? [[], []]

  // One product per item (colours share a card), in stock first, newest first.
  const items = useMemo(() => {
    const seen = new Set<string>()
    const firsts = products.filter((p) => !seen.has(groupKey(p)) && seen.add(groupKey(p)))
    return [...firsts].sort((a, b) => Number(totalStock(b) > 0) - Number(totalStock(a) > 0))
  }, [products])
  const colours = useMemo(() => coloursByGroup(products), [products])
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of items) if (totalStock(p) > 0) m.set(p.category_id, (m.get(p.category_id) ?? 0) + 1)
    return m
  }, [items])
  const railItems = items.filter((p) => totalStock(p) > 0 && sortedImages(p).length > 0).slice(0, RAIL)

  // Old shop links like /?cat=jeans now live at /shop.
  if (search) return <Navigate to={`/shop${search}`} replace />

  return (
    <div className="min-h-dvh bg-white">
      <SiteHeader settings={settings.data} />
      <Hero rail={railItems} />
      <Ticker />
      <DropBanner />

      <section aria-labelledby="new-in" className="mx-auto max-w-6xl px-5 pt-12">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 id="new-in" className="m-0 font-display text-[32px] font-black uppercase leading-none md:text-5xl">New in</h2>
          <Link to="/shop" className="flex min-h-11 items-center gap-1 text-sm font-bold underline underline-offset-4">
            Shop all
          </Link>
        </div>
        {catalog.loading && <ProductGridSkeleton />}
        {catalog.error && <ErrorBox message={catalog.error} onRetry={catalog.reload} />}
        {!catalog.loading && !catalog.error && (
          <div className="offset-grid grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:gap-x-5">
            {items.slice(0, NEW_IN).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} colours={colours.get(groupKey(p))} />
            ))}
          </div>
        )}
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="by-type" className="mx-auto max-w-6xl px-5 pt-14">
          <h2 id="by-type" className="m-0 mb-4 font-display text-[32px] font-black uppercase leading-none md:text-5xl">Shop by type</h2>
          <ul className="m-0 list-none border-t-[1.5px] border-ink p-0">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/shop?cat=${c.slug}`} className="type-row flex min-h-16 items-center justify-between gap-3 border-b-[1.5px] border-ink px-1">
                  <span className="font-display text-[26px] font-black uppercase leading-none md:text-4xl">{c.name}</span>
                  <span className="flex items-center gap-2 text-sm">
                    {counts.get(c.id) ?? 0} {counts.get(c.id) === 1 ? 'piece' : 'pieces'}
                    <ArrowRightIcon size={18} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SiteFooter settings={settings.data} />
    </div>
  )
}

/**
 * The first screen: a cut-out model standing in front of a clothes rail, with VRACK huge behind.
 * The model photo is uploaded in admin (Settings > Home page). Without it, the rail fills the space.
 * The rail shows the newest pieces in stock.
 */
function Hero({ rail }: { rail: Product[] }) {
  const ref = useRef<HTMLElement>(null)
  const [hasModel, setHasModel] = useState(true)
  useScrollProgress(ref)

  // Without a model, spread the pieces across the rail; with one, keep the middle clear for them.
  const spots = hasModel ? [12, 30, 70, 88] : [14, 38, 62, 86]

  return (
    <section ref={ref} aria-label="Vrack Clothing" className="hero relative overflow-hidden bg-surface">
      <div className="relative mx-auto h-[min(150vw,600px)] max-w-6xl md:h-[640px]">
        <p className="hero-word m-0 pt-6 text-center font-display font-black leading-[0.8]" aria-label="Vrack">
          {'VRACK'.split('').map((l, i) => (
            <span key={i} aria-hidden="true" className="hero-letter" style={{ '--i': i } as CSSProperties}>
              {l}
            </span>
          ))}
        </p>
        <p className="m-0 mt-3 text-center font-brand text-xs font-semibold tracking-[0.3em] md:text-sm">CLOTHING</p>

        <div className="absolute inset-x-0 top-[44%] md:top-[42%]">
          <div className="h-[5px] bg-[#8c8c86]" />
          {rail.map((p, i) => {
            const img = sortedImages(p)[0]
            return (
              <Link
                key={p.id}
                to={`/p/${p.id}`}
                aria-label={p.name}
                className="rail-piece absolute top-0 flex w-[21%] max-w-[150px] -translate-x-1/2 flex-col items-center"
                style={{ left: `${spots[i]}%`, '--i': i } as CSSProperties}
              >
                <svg viewBox="0 0 60 30" className="-mt-[11px] w-3/5 flex-none text-[#2a2a2a]" aria-hidden="true">
                  <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M30 14 V9 A5 5 0 1 1 35 4" />
                    <path d="M4 28 L30 14 L56 28" />
                  </g>
                </svg>
                <img
                  src={thumbUrl(img.path)}
                  onError={(e) => {
                    if (!e.currentTarget.src.endsWith(imageUrl(img.path))) e.currentTarget.src = imageUrl(img.path)
                  }}
                  alt=""
                  className="aspect-[3/4] w-full object-cover shadow-[0_18px_24px_-18px_rgb(0_0_0/0.45)]"
                />
              </Link>
            )
          })}
        </div>

        {hasModel && (
          <img
            src={imageUrl(HERO_MODEL_PATH)}
            alt=""
            onError={() => setHasModel(false)}
            className="hero-model pointer-events-none absolute bottom-0 left-1/2 h-[78%] w-auto max-w-none -translate-x-1/2 object-contain"
          />
        )}
      </div>

      <div className="relative bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 md:flex-row md:items-center md:justify-between">
          <p className="m-0 max-w-xs text-[15px] leading-snug">Men's clothing, picked by hand. Book online, pick up in store.</p>
          <div className="flex gap-2.5">
            <Link to="/shop" className="flex h-12 flex-1 items-center justify-center bg-ink px-6 text-[15px] font-bold text-white md:flex-none">
              Shop new in
            </Link>
            <a href="#by-type" className="flex h-12 flex-1 items-center justify-center border-[1.5px] border-ink px-6 text-[15px] font-bold md:flex-none">
              Shop by type
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Sets --p on the element: 0 when its top is at the top of the screen, 1 once it has scrolled away. */
function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const update = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)))
      el.style.setProperty('--p', p.toFixed(3))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ref])
}

const TICKER = ['Book online', 'Pick up in store', 'Pay cash or UPI on pickup', 'New pieces every week']

function Ticker() {
  const line = [...TICKER, ...TICKER]
  return (
    <div className="overflow-hidden bg-ink py-3 text-white" aria-label={TICKER.join(', ')}>
      <div className="ticker flex w-max" aria-hidden="true">
        {line.map((t, i) => (
          <span key={i} className="px-6 font-display text-sm font-bold uppercase">
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
