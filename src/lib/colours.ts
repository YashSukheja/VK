import type { Product } from './types'

/** Colours of one item share a group; a product on its own is its own group. */
export function groupKey(p: Pick<Product, 'id' | 'group_id'>): string {
  return p.group_id ?? p.id
}

/** "Oxford Shirt (Navy)" when a colour is set. */
export function displayName(p: Pick<Product, 'name' | 'colour'>): string {
  return p.colour ? `${p.name} (${p.colour})` : p.name
}

/** All colours of each group, keeping the list's order. */
export function coloursByGroup(products: Product[]): Map<string, Product[]> {
  const groups = new Map<string, Product[]>()
  for (const p of products) {
    const key = groupKey(p)
    groups.set(key, [...(groups.get(key) ?? []), p])
  }
  return groups
}
