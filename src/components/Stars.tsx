/** Read-only stars, e.g. 4 of 5 filled. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const rounded = Math.round(value)
  return (
    <span role="img" aria-label={`${Number(value.toFixed(1))} out of 5 stars`} className="inline-flex gap-px leading-none" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden="true" className={n <= rounded ? 'text-ink' : 'text-field'}>
          ★
        </span>
      ))}
    </span>
  )
}
