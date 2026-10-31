import { useEffect } from 'react'

/** Sets the browser tab title, e.g. "Your cart · Vrack Clothing". */
export function useTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Vrack Clothing` : 'Vrack Clothing'
  }, [title])
}
