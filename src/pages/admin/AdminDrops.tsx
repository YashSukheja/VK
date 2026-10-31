import { useState, type FormEvent } from 'react'
import { Card, fieldClass, Notice, PrimaryButton } from '../../components/admin'
import { ChatIcon } from '../../components/Icons'
import { Empty, ErrorBox, Loading } from '../../components/States'
import { fetchProducts } from '../../data/catalog'
import { deleteDrop, fetchDrops, fetchReminders, markReminderSent, saveDrop, setProductDrop } from '../../data/drops'
import { displayName } from '../../lib/colours'
import { formatDateTime, totalStock, whatsappLink } from '../../lib/format'
import type { Drop, Product } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'

/** The datetime-local value for an ISO time, in this phone's time zone. */
function toLocalInput(iso: string) {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

/** Drops: pieces that go live together at a set time, with a countdown on the home page. */
export function AdminDrops() {
  const { data, error, loading, reload } = useAsync(() => Promise.all([fetchDrops(), fetchProducts()]), [])
  const [open, setOpen] = useState<string | null>(null)

  if (loading && !data) return <Loading />
  if (error) {
    const missing = /drops/.test(error) && /exist|schema cache/.test(error)
    return <ErrorBox message={missing ? 'Drops need setup file 8. Run it in Supabase first.' : error} onRetry={reload} />
  }
  const [drops, products] = data ?? [[], []]

  return (
    <div className="flex flex-col gap-3 pb-6">
      <h1 className="m-0 font-display text-2xl font-black uppercase">Drops</h1>
      <p className="m-0 text-sm text-body">
        A drop is a set of pieces that go live together at a set time. Until then, shoppers see only a countdown on the home page, and can tap
        Remind me.
      </p>
      <DropForm onSaved={(id) => (setOpen(id), reload())} />
      {drops.length === 0 ? (
        <Empty>No drops yet.</Empty>
      ) : (
        drops.map((d) => (
          <DropCard key={d.id} drop={d} products={products} expanded={open === d.id} onToggle={() => setOpen(open === d.id ? null : d.id)} onChanged={reload} />
        ))
      )}
    </div>
  )
}

function DropForm({ drop, onSaved }: { drop?: Drop; onSaved: (id: string) => void }) {
  const [name, setName] = useState(drop?.name ?? '')
  const [when, setWhen] = useState(drop ? toLocalInput(drop.starts_at) : '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !when) return setMessage({ kind: 'error', text: 'Give the drop a name, a date and a time.' })
    setBusy(true)
    setMessage(null)
    try {
      const id = await saveDrop({ id: drop?.id, name, starts_at: new Date(when).toISOString() })
      setMessage({ kind: 'ok', text: drop ? 'Drop saved.' : 'Drop created. Now add its pieces below.' })
      if (!drop) {
        setName('')
        setWhen('')
      }
      onSaved(id)
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save.' })
    }
    setBusy(false)
  }

  const fields = (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-extrabold">
        Drop name
        <input className={fieldClass} maxLength={60} placeholder="e.g. Winter jackets" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-extrabold">
        Goes live at
        <input type="datetime-local" className={fieldClass} value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? 'Saving…' : drop ? 'Save drop' : 'Create drop'}
      </PrimaryButton>
    </>
  )
  return drop ? (
    <form onSubmit={save} className="flex flex-col gap-3">
      {fields}
    </form>
  ) : (
    <Card title="New drop">
      <form onSubmit={save} className="flex flex-col gap-3">
        {fields}
      </form>
    </Card>
  )
}

function DropCard({
  drop,
  products,
  expanded,
  onToggle,
  onChanged,
}: {
  drop: Drop
  products: Product[]
  expanded: boolean
  onToggle: () => void
  onChanged: () => void
}) {
  const live = new Date(drop.starts_at).getTime() <= Date.now()
  // Ticks show straight away; the list refreshes behind them.
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const isIn = (p: Product) => picked[p.id] ?? p.drop_id === drop.id
  const inDrop = products.filter(isIn)
  const [error, setError] = useState<string | null>(null)

  async function toggleProduct(p: Product, on: boolean) {
    setError(null)
    setPicked((m) => ({ ...m, [p.id]: on }))
    try {
      await setProductDrop(p.id, on ? drop.id : null)
      onChanged()
    } catch (err) {
      setPicked((m) => ({ ...m, [p.id]: !on }))
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the drop “${drop.name}”? Its pieces stay, and show in the shop straight away.`)) return
    try {
      await deleteDrop(drop.id)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <Card>
      <button type="button" aria-expanded={expanded} onClick={onToggle} className="flex min-h-11 items-center justify-between gap-3 text-left">
        <span className="flex flex-col">
          <span className="font-display text-lg font-black uppercase">{drop.name}</span>
          <span className="text-xs text-muted">
            {live ? 'Live since' : 'Goes live'} {formatDateTime(drop.starts_at)} · {inDrop.length} {inDrop.length === 1 ? 'piece' : 'pieces'}
          </span>
        </span>
        <span className={`px-2 py-1 text-[11px] font-extrabold uppercase ${live ? 'bg-ink text-white' : 'border-[1.5px] border-ink'}`}>
          {live ? 'Live' : 'Upcoming'}
        </span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-4 border-t border-line pt-3">
          <DropForm drop={drop} onSaved={onChanged} />
          <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
            <legend className="mb-1 text-sm font-extrabold">Pieces in this drop</legend>
            <span className="mb-1 text-xs text-muted">Ticked pieces stay hidden from the shop until the drop goes live.</span>
            {products
              .filter((p) => !p.drop_id || p.drop_id === drop.id)
              .map((p) => (
                <label key={p.id} className="flex min-h-11 items-center gap-3 border-b border-[#f0f0ec] text-sm">
                  <input type="checkbox" className="size-5 accent-black" checked={isIn(p)} onChange={(e) => void toggleProduct(p, e.target.checked)} />
                  <span className="flex-1 font-bold">{displayName(p)}</span>
                  <span className="text-xs text-muted">{totalStock(p)} in stock</span>
                </label>
              ))}
          </fieldset>
          <Reminders drop={drop} live={live} />
          {error && <Notice kind="error">{error}</Notice>}
          <button type="button" onClick={() => void remove()} className="min-h-11 text-sm font-bold text-danger underline underline-offset-4">
            Delete drop
          </button>
        </div>
      )}
    </Card>
  )
}

function Reminders({ drop, live }: { drop: Drop; live: boolean }) {
  const list = useAsync(() => fetchReminders(drop.id), [drop.id])
  const [sent, setSent] = useState<string[]>([])
  const rows = list.data ?? []
  const link = `${window.location.origin}/shop?drop=${drop.id}`
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-extrabold">
        Remind me: {rows.length} {rows.length === 1 ? 'customer' : 'customers'}
      </span>
      {rows.length > 0 && !live && <span className="text-xs text-muted">Once the drop is live, tap Tell to message each one on WhatsApp.</span>}
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((r) => {
          const done = !!r.notified_at || sent.includes(r.customer_id)
          return (
            <li key={r.customer_id} className="flex min-h-11 items-center justify-between gap-3 border-b border-[#f0f0ec] text-sm last:border-0">
              <span className="font-bold">{r.customer?.username ?? 'Customer'}</span>
              {done ? (
                <span className="text-xs text-muted">Told</span>
              ) : (
                live &&
                r.customer?.mobile && (
                  <a
                    href={whatsappLink(r.customer.mobile, `Hi ${r.customer.username}, the ${drop.name} drop is live at Vrack Clothing: ${link}`)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      setSent((s) => [...s, r.customer_id])
                      void markReminderSent(drop.id, r.customer_id)
                    }}
                    className="flex min-h-10 items-center gap-1.5 bg-ink px-3 text-sm font-extrabold text-white"
                  >
                    <ChatIcon size={16} />
                    Tell
                  </a>
                )
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
