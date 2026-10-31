import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router'
import { discountPercent, formatPrice, sortedImages } from '../../lib/format'
import { imageUrl, thumbUrl } from '../../lib/supabase'
import type { Product } from '../../lib/types'
import { Photo } from '../Photo'

gsap.registerPlugin(ScrollTrigger)

/**
 * "On the rack": the newest pieces stand in a 3D ring that turns as the page scrolls past,
 * and can be swiped or stepped with the arrows. The card in front is sharp; the ones behind fade.
 * With reduce motion on, or with fewer than 4 pieces, it is a plain sideways row.
 */
export function RackRing({ products, total }: { products: Product[]; total: number }) {
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const ring = products.length >= 4 && !still

  return (
    <section aria-labelledby="on-rack" className="overflow-hidden bg-[#f4f4f2] pb-6 pt-12 md:pt-16">
      <div className="mx-auto mb-2 flex max-w-6xl items-baseline justify-between px-5">
        <h2 id="on-rack" className="m-0 font-display text-[28px] font-black uppercase leading-none md:text-5xl">
          On the rack
        </h2>
        <Link to="/shop" className="flex min-h-11 items-center text-sm font-bold underline underline-offset-4">
          Shop all {total}
        </Link>
      </div>
      {ring ? <Ring products={products} /> : <Row products={products} />}
    </section>
  )
}

function Row({ products }: { products: Product[] }) {
  return (
    <ul className="no-scrollbar mx-auto mt-2 flex max-w-6xl list-none snap-x gap-3 overflow-x-auto px-5 pb-2 md:gap-5">
      {products.map((p) => (
        <li key={p.id} className="w-[44vw] max-w-60 flex-none snap-start">
          <Card product={p} />
        </li>
      ))}
    </ul>
  )
}

function Ring({ products }: { products: Product[] }) {
  const stage = useRef<HTMLDivElement>(null)
  const spinner = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLLIElement | null)[]>([])
  const state = useRef({ scroll: 0, drag: { value: 0 }, dragging: false, startX: 0, startDrag: 0, moved: false })
  const [front, setFront] = useState(0)
  const n = products.length
  const step = 360 / n

  // Draws the ring for the current angle: places each card and fades the ones turned away.
  const draw = useRef(() => {})
  draw.current = () => {
    const el = spinner.current
    if (!el) return
    const angle = state.current.scroll + state.current.drag.value
    el.style.transform = `translateZ(calc(var(--r) * -1)) rotateX(-7deg) rotateY(${angle}deg)`
    cards.current.forEach((card, i) => {
      if (!card) return
      const facing = Math.cos(((i * step + angle) * Math.PI) / 180) // 1 in front, -1 behind
      card.style.opacity = String(0.15 + 0.85 * Math.max(0, (facing + 0.3) / 1.3))
      card.style.zIndex = String(Math.round(facing * 100) + 100)
    })
    const i = ((Math.round(-angle / step) % n) + n) % n
    setFront((f) => (f === i ? f : i))
  }

  useLayoutEffect(() => {
    draw.current()
    const st = ScrollTrigger.create({
      trigger: stage.current,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        state.current.scroll = -self.progress * step * Math.min(n, 4)
        draw.current()
      },
    })
    return () => st.kill()
  }, [n, step])

  useEffect(() => {
    const onResize = () => draw.current()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function turnTo(value: number) {
    gsap.to(state.current.drag, { value, duration: 0.6, ease: 'power3.out', onUpdate: () => draw.current() })
  }
  function by(cards: number) {
    const s = state.current
    turnTo(Math.round((s.scroll + s.drag.value) / step) * step - s.scroll - cards * step)
  }

  function down(e: ReactPointerEvent) {
    const s = state.current
    gsap.killTweensOf(s.drag)
    Object.assign(s, { dragging: true, startX: e.clientX, startDrag: s.drag.value, moved: false })
  }
  function move(e: ReactPointerEvent) {
    const s = state.current
    if (!s.dragging) return
    const dx = e.clientX - s.startX
    if (Math.abs(dx) > 6) s.moved = true
    s.drag.value = s.startDrag + dx * 0.35
    draw.current()
  }
  function up() {
    const s = state.current
    if (!s.dragging) return
    s.dragging = false
    if (s.moved) by(0) // settle on the nearest card
  }

  return (
    <div>
      <div
        ref={stage}
        className="relative mx-auto h-[330px] touch-pan-y select-none [--card:168px] [--r:240px] [perspective:800px] md:h-[450px] md:[--card:230px] md:[--r:470px]"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        onClickCapture={(e) => {
          // A swipe that ends on a card shouldn't open it.
          if (state.current.moved) {
            e.preventDefault()
            e.stopPropagation()
            state.current.moved = false
          }
        }}
      >
        <div ref={spinner} className="absolute left-1/2 top-4 h-0 w-0 [transform-style:preserve-3d]">
          <ul className="m-0 list-none p-0 [transform-style:preserve-3d]">
            {products.map((p, i) => (
              <li
                key={p.id}
                ref={(el) => {
                  cards.current[i] = el
                }}
                className="absolute left-[calc(var(--card)/-2)] top-0 w-[var(--card)]"
                style={{ transform: `rotateY(${i * step}deg) translateZ(var(--r))` }}
                onFocus={() => turnTo(-i * step - state.current.scroll)}
              >
                <Card product={p} big />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5">
        <p className="m-0 font-display text-sm font-extrabold uppercase" aria-live="polite">
          {String(front + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          <span className="ml-2 font-sans font-semibold normal-case text-muted">{products[front]?.name}</span>
        </p>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous look" onClick={() => by(-1)} className="flex size-11 items-center justify-center border-[1.5px] border-ink text-lg font-bold">
            ←
          </button>
          <button type="button" aria-label="Next look" onClick={() => by(1)} className="flex size-11 items-center justify-center bg-ink text-lg font-bold text-white">
            →
          </button>
        </div>
      </div>
    </div>
  )
}

function Card({ product: p, big = false }: { product: Product; big?: boolean }) {
  const img = sortedImages(p)[0]
  const off = discountPercent(p.price, p.mrp)
  return (
    <Link to={`/p/${p.id}`} draggable={false} className="group block bg-white shadow-[0_24px_40px_-24px_rgb(0_0_0/0.45)]">
      <span className="relative block aspect-[3/4] overflow-hidden bg-photo">
        <Photo src={thumbUrl(img.path)} fallbackSrc={imageUrl(img.path)} alt={p.name} className="pointer-events-none transition-transform duration-500 group-hover:scale-105" />
        {off !== null && <span className="absolute left-2 top-2 bg-ink px-1.5 py-0.5 text-[10px] font-extrabold text-white">{off}% OFF</span>}
      </span>
      <span className={`flex items-baseline justify-between gap-2 px-2.5 ${big ? 'py-2.5' : 'py-2'}`}>
        <span className="truncate text-[13px] font-semibold">{p.name}</span>
        <span className="flex-none font-display text-sm font-black">{formatPrice(p.price)}</span>
      </span>
    </Link>
  )
}
