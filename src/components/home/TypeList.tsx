import { useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { Link } from 'react-router'
import type { Category } from '../../lib/types'
import { imageUrl, thumbUrl } from '../../lib/supabase'
import { Photo } from '../Photo'

export type TypeRow = { category: Category; cover: string | null; pieces: number }

/**
 * "Shop by type" as a big list. On phones each row shows its photo at the side;
 * on desktop the photo follows the mouse over the row.
 */
export function TypeList({ rows }: { rows: TypeRow[] }) {
  const box = useRef<HTMLUListElement>(null)
  const [hover, setHover] = useState<{ cover: string; x: number; y: number } | null>(null)

  function track(e: MouseEvent, cover: string | null) {
    const r = box.current?.getBoundingClientRect()
    if (!r || !cover) return setHover(null)
    setHover({ cover, x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <section aria-labelledby="by-type" className="mx-auto max-w-6xl px-5 pt-14 md:pt-20">
      <h2 id="by-type" className="m-0 mb-3 font-display text-[28px] font-black uppercase leading-none md:text-5xl">
        Shop by type
      </h2>
      <ul ref={box} className="relative m-0 list-none border-t-2 border-ink p-0" onMouseLeave={() => setHover(null)}>
        {rows.map(({ category, cover, pieces }, i) => (
          <li key={category.id} className="rise-on-scroll border-b border-line" style={{ '--i': i } as CSSProperties}>
            <Link
              to={`/shop?cat=${category.slug}`}
              onMouseMove={(e) => track(e, cover)}
              className="group flex items-center gap-4 py-3 md:py-5"
              aria-label={`${category.name}, ${pieces} ${pieces === 1 ? 'piece' : 'pieces'}`}
            >
              <span className="flex flex-1 items-start gap-2 font-display text-[40px] font-black uppercase leading-[0.9] tracking-[-0.02em] transition-transform duration-300 group-hover:translate-x-2 md:text-[88px]">
                {category.name}
                <sup className="mt-1 text-xs font-extrabold tracking-normal md:text-base">{pieces}</sup>
              </span>
              {cover && (
                <span className="block h-20 w-16 flex-none overflow-hidden bg-photo md:hidden">
                  <Photo src={thumbUrl(cover)} fallbackSrc={imageUrl(cover)} alt="" className="[&_span]:hidden" />
                </span>
              )}
              <span aria-hidden="true" className="hidden font-display text-3xl font-black transition-transform duration-300 group-hover:translate-x-1 md:block">
                →
              </span>
            </Link>
          </li>
        ))}
        {hover && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute z-10 hidden h-64 w-48 overflow-hidden bg-photo shadow-xl md:block"
            style={{ left: hover.x + 24, top: hover.y - 128, transform: `rotate(${(hover.x % 7) - 3}deg)` }}
          >
            <Photo src={thumbUrl(hover.cover)} fallbackSrc={imageUrl(hover.cover)} alt="" className="[&_span]:hidden" />
          </span>
        )}
      </ul>
    </section>
  )
}
