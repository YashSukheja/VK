import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Card, fieldClass } from '../../components/admin'
import { PlusIcon } from '../../components/Icons'
import { Photo } from '../../components/Photo'
import { fetchColours, fetchProducts } from '../../data/catalog'
import { displayName } from '../../lib/colours'
import { formatPrice, sortedImages, totalStock } from '../../lib/format'
import { imageUrl, supabase, thumbUrl } from '../../lib/supabase'
import type { Product } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'

/** The other colours of this item: add a new colour, link an existing product, or unlink one. */
export function ColourGroup({ product }: { product: Product }) {
  const navigate = useNavigate()
  const ready = 'colour' in product
  const data = useAsync(
    async () => (ready ? Promise.all([product.group_id ? fetchColours(product.group_id) : [product], fetchProducts()]) : null),
    [product.id, product.group_id],
  )
  const [error, setError] = useState<string | null>(null)

  if (!ready) {
    return (
      <Card title="Colours of this item">
        <p className="m-0 text-sm text-muted">Run setup file 7 in Supabase to add more colours of this item.</p>
      </Card>
    )
  }
  const [colours, all] = data.data ?? [[product], []]
  const groupId = product.group_id ?? product.id
  const others = all.filter((p) => !colours.some((c) => c.id === p.id))
  // Same category first, since that's where another colour usually is.
  others.sort((a, b) => Number(b.category_id === product.category_id) - Number(a.category_id === product.category_id))

  async function setGroup(ids: string[], group: string | null) {
    setError(null)
    const { error: err } = await supabase.from('products').update({ group_id: group }).in('id', ids)
    if (err) return setError(err.message)
    // Reload the page so every part sees the new group.
    navigate(`/admin/products/${product.id}`, { replace: true })
  }

  return (
    <Card title="Colours of this item" aside={<span className="text-xs font-bold">{colours.length === 1 ? 'Only this colour' : `${colours.length} colours`}</span>}>
      {colours.length > 1 && (
        <ul className="m-0 flex list-none flex-col p-0">
          {colours.map((c) => {
            const img = sortedImages(c)[0]
            const current = c.id === product.id
            return (
              <li key={c.id} className="flex items-center gap-3 border-b border-[#f0f0ec] py-2 last:border-0">
                <span className="block h-12 w-9 flex-none overflow-hidden rounded-md bg-photo">
                  <Photo src={img ? thumbUrl(img.path) : undefined} fallbackSrc={img ? imageUrl(img.path) : undefined} alt="" className="[&_span]:hidden" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-extrabold">{c.colour ?? 'No colour name yet'}</span>
                  <span className="text-xs text-muted">
                    {formatPrice(c.price)} · {totalStock(c)} in stock
                  </span>
                </span>
                {current ? (
                  <span className="text-xs font-bold text-muted">This one</span>
                ) : (
                  <span className="flex items-center gap-3 text-sm font-extrabold">
                    <Link to={`/admin/products/${c.id}`} className="min-h-11 content-center underline underline-offset-4">
                      Edit
                    </Link>
                    <button
                      type="button"
                      aria-label={`Unlink ${displayName(c)}`}
                      onClick={() => {
                        if (window.confirm(`Show ${displayName(c)} as a separate item again?`)) void setGroup([c.id], null)
                      }}
                      className="min-h-11 text-muted underline underline-offset-4"
                    >
                      Unlink
                    </button>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <Link
        to={`/admin/products/new?colourOf=${product.id}`}
        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-ink text-sm font-extrabold"
      >
        <PlusIcon size={16} />
        Add another colour
      </Link>
      {others.length > 0 && (
        <label className="flex flex-col gap-1.5 text-sm font-extrabold">
          Or link a product you already added
          <select
            className={fieldClass}
            value=""
            onChange={(e) => {
              const target = e.target.value
              if (target) void setGroup(product.group_id ? [target] : [target, product.id], groupId)
            }}
          >
            <option value="">Choose a product…</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {displayName(p)}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="m-0 text-xs font-semibold text-muted">Save changes on this page before adding or linking a colour.</p>
      {error && (
        <p role="alert" className="m-0 text-xs font-bold text-danger">
          {error}
        </p>
      )}
    </Card>
  )
}
