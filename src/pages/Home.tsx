import { useCallback, useMemo, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { DropBanner } from '../components/DropBanner'
import { HeroShow } from '../components/home/HeroShow'
import { Intro } from '../components/home/Intro'
import { RackRing } from '../components/home/RackRing'
import { TypeList } from '../components/home/TypeList'
import { HowItWorks } from '../components/home/HowItWorks'
import { ReviewFolders } from '../components/home/ReviewFolders'
import { VisitUs } from '../components/home/VisitUs'
import { ProductCard } from '../components/ProductCard'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { ProductGridSkeleton } from '../components/Skeletons'
import { ErrorBox } from '../components/States'
import { fetchCategories, fetchProducts, fetchSettings } from '../data/catalog'
import { fetchReviewWall } from '../data/reviews'
import { coloursByGroup, groupKey } from '../lib/colours'
import { sortedImages, totalStock } from '../lib/format'
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
  const reviews = useAsync(fetchReviewWall, [])
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

      {withPhoto.length > 0 && <RackRing products={withPhoto.slice(0, ON_RACK)} total={inStock.length} />}

      {tiles.some((t) => t.pieces > 0) && <TypeList rows={tiles.filter((t) => t.pieces > 0)} />}

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

      <HowItWorks />

      {reviews.data && <ReviewFolders {...reviews.data} />}

      <VisitUs settings={settings.data} />

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
    return { category, cover: cover ? sortedImages(cover)[0].path : null, pieces: count }
  })
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

