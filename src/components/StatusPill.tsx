import { STATUS_LABEL } from '../lib/format'
import type { BookingStatus } from '../lib/types'

const STYLE: Record<BookingStatus, string> = {
  pending: 'border-[1.5px] border-dashed border-ink bg-white text-ink',
  confirmed: 'border-[1.5px] border-ink bg-ink text-white',
  completed: 'border-[1.5px] border-ink bg-white text-ink',
  rejected: 'border-[1.5px] border-surface bg-surface text-muted line-through',
  cancelled: 'border-[1.5px] border-surface bg-surface text-muted line-through',
}

export function StatusPill({ status }: { status: BookingStatus }) {
  return <span className={`whitespace-nowrap px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${STYLE[status]}`}>{STATUS_LABEL[status]}</span>
}
