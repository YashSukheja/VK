import type { MeasureKey, Measurements } from './types'

export const MEASURES: { key: MeasureKey; label: string; hint: string }[] = [
  { key: 'chest', label: 'Chest', hint: 'Armpit to armpit, doubled' },
  { key: 'shoulder', label: 'Shoulder', hint: 'Seam to seam across the back' },
  { key: 'length', label: 'Length', hint: 'Collar or waistband to the hem' },
  { key: 'waist', label: 'Waist', hint: 'Across the waistband, doubled' },
  { key: 'inseam', label: 'Inseam', hint: 'Crotch seam to the hem' },
]

/** The filled-in measurements, in display order. */
export function filledMeasures(m: Measurements | null | undefined) {
  if (!m) return []
  return MEASURES.filter((x) => typeof m[x.key] === 'number' && m[x.key]! > 0).map((x) => ({ ...x, value: m[x.key]! }))
}
