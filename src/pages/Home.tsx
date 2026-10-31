import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { DropBanner } from '../components/DropBanner'
import { HeroShow } from '../components/home/HeroShow'
import { Intro } from '../components/home/Intro'
import { Photo } from '../components/Photo'
import { ProductCard } from '../components/ProductCard'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { ProductGridSkeleton } from '../components/Skeletons'
import { Stars } from '../components/Stars'
import { ErrorBox } from '../components/States'
import { fetchCategories, fetchProducts, fetchSettings } from '../data/catalog'
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
  const [introDone, setIntroDone] = useState(false)
  const endIntro = useCallback(() => setIntroDone(true), [])
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
      {!introDone && <Intro onDone={endIntro} />}
      <SiteHeader settings={settings.data} />
      <HeroShow pieces={inStock.length} play={introDone} />
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

