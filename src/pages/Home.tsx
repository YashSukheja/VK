import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { DropBanner } from '../components/DropBanner'
import { Photo } from '../components/Photo'
import { ProductCard } from '../components/ProductCard'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { ProductGridSkeleton } from '../components/Skeletons'
import { Stars } from '../components/Stars'
import { ErrorBox } from '../components/States'
import { fetchCategories, fetchProducts, fetchSettings, DEMO_HERO_PHOTO, HERO_PHOTO_PATH } from '../data/catalog'
import { fetchReviewHighlight } from '../data/reviews'
import { coloursByGroup, groupKey } from '../lib/colours'
import { discountPercent, formatPrice, sortedImages, totalStock } from '../lib/format'
import { imageUrl, thumbUrl } from '../lib/supabase'
import type { Category, Product } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { useTitle } from '../lib/useTitle'

const ON_RACK = 8
const NEW_IN = 6

export function Home() {
  const { search } = useLocation()
  useTitle(null)
  const catalog = useAsync(() => Promise.all([fetchCategories(), fetchProducts()]), [])
  const settings = useAsync(fetchSettings, [])
  const highlight = useAsync(fetchReviewHighlight, [])
  const [categories, products] = catalog.data ?? [[], []]

  // One product per item (colours share a card), newest first.
  const items = useMemo(() => {
    const seen = new Set<string>()
    return products.filter((p) => !seen.has(groupKey(p)) && seen.add(groupKey(p)))
  }, [products])
  const inStock = useMemo(() => items.filter((p) => totalStock(p) > 0), [items])
  const withPhoto = useMemo(() => inStock.filter((p) => sortedImages(p).length > 0), [inStock])
  const colours = useMemo(() => coloursByGroup(products), [products])
  const tiles = useMemo(() => typeTiles(categories, items), [categories, items])

  // Old shop links like /?cat=jeans now live at /shop.
  if (search) return <Navigate to={`/shop${search}`} replace />

  return (
    <div className="min-h-dvh bg-white">
      <SiteHeader settings={settings.data} />
      <Hero pieces={inStock.length} />
      <Ticker />

      {withPhoto.length > 0 && (
        <section aria-labelledby="on-rack" className="bg-[#f4f4f2] pb-2 pt-10">
          <div className="mx-auto mb-4 flex max-w-6xl items-baseline justify-between px-5">
            <h2 id="on-rack" className="m-0 font-display text-[28px] font-black uppercase leading-none md:text-5xl">
              On the rack
            </h2>
            <Link to="/shop" className="flex min-h-11 items-center text-sm font-bold underline underline-offset-4">
              Shop all {inStock.length}
            </Link>
          </div>
          <ul className="no-scrollbar mx-auto flex max-w-6xl list-none snap-x gap-3 overflow-x-auto px-5 pb-6 md:gap-5">
            {withPhoto.slice(0, ON_RACK).map((p, i) => (
              <li key={p.id} className="w-[44vw] max-w-60 flex-none snap-start">
                <RackCard product={p} index={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {tiles.length > 0 && (
        <section aria-labelledby="by-type" className="mx-auto max-w-6xl px-5 pt-10">
          <h2 id="by-type" className="m-0 mb-4 font-display text-[28px] font-black uppercase leading-none md:text-5xl">
            Shop by type
          </h2>
          <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 md:grid-cols-4 md:gap-4">
            {tiles.map(({ category, cover, count }) => (
              <li key={category.id}>
                <Link to={`/shop?cat=${category.slug}`} className="type-tile group relative block aspect-[4/5] overflow-hidden bg-photo">
                  <Photo
                    src={cover ? thumbUrl(cover) : undefined}
                    fallbackSrc={cover ? imageUrl(cover) : undefined}
                    alt=""
                    className="transition-transform duration-500 group-hover:scale-105 [&_span]:hidden"
                  />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-ink px-3 py-2.5 text-white">
                    <span className="font-display text-[15px] font-black uppercase leading-none md:text-lg">{category.name}</span>
                    <span className="text-xs">{count}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="new-in" className="mx-auto max-w-6xl px-5 pb-12 pt-12">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 id="new-in" className="m-0 font-display text-[28px] font-black uppercase leading-none md:text-5xl">
            New in
          </h2>
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

      <DropBanner />

      {highlight.data && (
        <section aria-label="What customers say" className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
            <Stars value={highlight.data.review.rating} size={18} light />
            <p className="m-0 mt-3 max-w-3xl font-display text-[22px] font-extrabold leading-tight md:text-4xl">“{highlight.data.review.comment}”</p>
            <p className="m-0 mt-3 text-xs text-[#bdbdb8]">
              {highlight.data.review.customer_name} · Verified buyer · {highlight.data.average.toFixed(1)} average from {highlight.data.count}{' '}
              {highlight.data.count === 1 ? 'review' : 'reviews'}
            </p>
          </div>
        </section>
      )}

      <SiteFooter settings={settings.data} />
    </div>
  )
}

/** Each type with a photo of its newest piece and how many are in stock. */
function typeTiles(categories: Category[], items: Product[]) {
  return categories.map((category) => {
    const mine = items.filter((p) => p.category_id === category.id)
    const cover = mine.find((p) => totalStock(p) > 0 && sortedImages(p).length) ?? mine.find((p) => sortedImages(p).length)
    const count = mine.filter((p) => totalStock(p) > 0).length
    return { category, cover: cover ? sortedImages(cover)[0].path : null, count: `${count} ${count === 1 ? 'piece' : 'pieces'}` }
  })
}

/** A big photo card for the On the rack row. */
function RackCard({ product: p, index }: { product: Product; index: number }) {
  const img = sortedImages(p)[0]
  const off = discountPercent(p.price, p.mrp)
  return (
    <Link to={`/p/${p.id}`} className="rise-on-scroll group flex flex-col gap-1.5" style={{ '--i': index } as CSSProperties}>
      <span className="block aspect-[3/4] overflow-hidden bg-photo">
        <Photo src={thumbUrl(img.path)} fallbackSrc={imageUrl(img.path)} alt={p.name} className="transition-transform duration-500 group-hover:scale-105" />
      </span>
      <span className="truncate text-sm font-semibold">{p.name}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-base font-black">{formatPrice(p.price)}</span>
        {off !== null && p.mrp && <span className="text-xs text-muted line-through">{formatPrice(p.mrp)}</span>}
      </span>
    </Link>
  )
}

/**
 * The first screen, like a studio poster: corner labels, a big headline, and the mannequin photo.
 * A photo uploaded in admin (Settings > Home page) replaces the built-in one.
 */
function Hero({ pieces }: { pieces: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState(() => imageUrl(HERO_PHOTO_PATH))
  useScrollProgress(ref)
  const [month] = useState(() => new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' }).toUpperCase())

  return (
    // The track is taller than the hero, so the hero holds still for a short scroll while the motion plays.
    <div ref={ref} className="hero-track bg-studio relative pb-[260px] motion-reduce:pb-0">
    <section aria-label="New on the rack" className="sticky top-16 overflow-hidden">
      <div className="relative mx-auto flex max-w-6xl flex-col px-5 pb-6 pt-5 md:pt-8">
        <div className="flex justify-between font-display text-[13px] font-extrabold uppercase leading-[1.1] md:text-sm">
          <span>
            New on
            <br />
            the rack
          </span>
          <span className="text-right">
            {pieces > 0 ? `${pieces} ${pieces === 1 ? 'piece' : 'pieces'}` : 'Every week'}
            <br />
            {month}
          </span>
        </div>

        <span aria-hidden="true" className="poster-in mt-9 text-center text-base tracking-[2px] md:mt-6" style={{ '--i': 0 } as CSSProperties}>
          ✦✦✦
        </span>
        <h1 className="hero-headline relative z-[1] m-0 mt-2.5 text-center font-display text-[44px] font-black uppercase leading-[0.92] tracking-[-0.03em] md:text-[88px]">
          <span className="poster-in block" style={{ '--i': 1 } as CSSProperties}>
            The new
          </span>
          <span className="poster-in block" style={{ '--i': 2 } as CSSProperties}>
            rack is in
          </span>
        </h1>
        <p className="poster-in m-0 mx-auto mt-3.5 max-w-xs text-center text-[15px] leading-snug md:text-base" style={{ '--i': 3 } as CSSProperties}>
          Hand-picked men's clothing. Book online, pick up in store.
        </p>

        <div className="relative -mx-5 mt-4 h-[420px] md:mx-0 md:h-[560px]">
          <p aria-hidden="true" className="hero-outline pointer-events-none absolute left-0 top-1/2 m-0 -translate-y-1/2 font-display font-black leading-none">
            VRACK CLOTHING
          </p>
          <img
            src={src}
            alt="This week's look: sage green shirt with washed black jeans"
            onError={() => setSrc(DEMO_HERO_PHOTO)}
            className="hero-photo relative h-full w-full object-contain drop-shadow-[0_30px_24px_rgb(0_0_0/0.18)]"
          />
        </div>

        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="font-display text-[13px] font-extrabold uppercase leading-[1.1] md:text-sm">
            Never
            <br />
            basic
          </span>
          <span className="max-w-[11rem] text-center text-[11px] leading-snug md:max-w-xs md:text-[13px]">
            Every piece checked by hand. Pay cash or UPI when you collect.
          </span>
          <Link to="/shop" className="flex min-h-11 items-end text-right font-display text-[13px] font-extrabold uppercase leading-[1.1] md:text-sm">
            <span>
              Shop
              <br />
              now →
            </span>
          </Link>
        </div>
      </div>
    </section>
    </div>
  )
}

const TICKER = ['Book online', 'Pick up in store', 'Pay cash or UPI on pickup', 'New pieces every week']

function Ticker() {
  const line = [...TICKER, ...TICKER]
  return (
    <div className="relative z-[1] overflow-hidden bg-ink py-3 text-white" aria-label={TICKER.join(', ')}>
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

/** Sets --p on the hero track: 0 at the top of the page, 1 once its extra scroll has passed. */
function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const update = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const extra = parseFloat(getComputedStyle(el).paddingBottom) || r.height
      const p = Math.min(1, Math.max(0, -r.top / extra))
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
