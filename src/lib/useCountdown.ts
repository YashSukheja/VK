import { useEffect, useState } from 'react'

/** Days, hours, minutes and seconds left until `to`, ticking every second. */
export function useCountdown(to: string) {
  const target = new Date(to).getTime()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const left = Math.max(0, target - now)
  const s = Math.floor(left / 1000)
  return { done: left === 0, days: Math.floor(s / 86400), hours: Math.floor(s / 3600) % 24, minutes: Math.floor(s / 60) % 60, seconds: s % 60 }
}
