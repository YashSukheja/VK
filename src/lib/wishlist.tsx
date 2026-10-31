import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'

type WishlistState = {
  ids: Set<string>
  /** Adds or removes a heart. Returns false when nobody is logged in. */
  toggle: (productId: string) => Promise<boolean>
}

const WishlistContext = createContext<WishlistState | null>(null)

/** The logged-in customer's hearts, shared by every card on the page. */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  // Hearts belong to one login; a different (or no) login starts empty.
  const [state, setState] = useState<{ owner: string | null; ids: Set<string> }>({ owner: null, ids: new Set() })
  const ids = useMemo(() => (state.owner === userId ? state.ids : new Set<string>()), [state, userId])
  const setIds = useCallback(
    (update: (cur: Set<string>) => Set<string>) => setState((s) => ({ owner: userId ?? null, ids: update(s.owner === userId ? s.ids : new Set()) })),
    [userId],
  )

  useEffect(() => {
    let live = true
    if (!userId) return
    void supabase
      .from('wishlist')
      .select('product_id')
      .then(({ data }) => {
        // Before setup file 8 there is no wishlist table; hearts just start empty.
        if (live && data) setState({ owner: userId, ids: new Set(data.map((r) => r.product_id as string)) })
      })
    return () => {
      live = false
    }
  }, [userId])

  const toggle = useCallback(
    async (productId: string) => {
      if (!userId) return false
      const had = ids.has(productId)
      const flip = (on: boolean) =>
        setIds((cur) => {
          const next = new Set(cur)
          if (on) next.add(productId)
          else next.delete(productId)
          return next
        })
      flip(!had)
      const { error } = had
        ? await supabase.from('wishlist').delete().eq('product_id', productId)
        : await supabase.from('wishlist').insert({ product_id: productId })
      if (error) flip(had)
      return true
    },
    [ids, userId, setIds],
  )

  return <WishlistContext.Provider value={{ ids, toggle }}>{children}</WishlistContext.Provider>
}

export function useWishlist(): WishlistState {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist needs WishlistProvider')
  return ctx
}
