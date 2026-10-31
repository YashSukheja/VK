import { supabase } from '../lib/supabase'
import type { Drop } from '../lib/types'

export type UpcomingDrop = Drop & { pieces: number }

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

/** Drops coming up, and ones that started in the last 3 days. Empty before setup file 8. */
export async function fetchUpcomingDrops(): Promise<UpcomingDrop[]> {
  const { data, error } = await supabase.rpc('upcoming_drops')
  if (error) return []
  return data as UpcomingDrop[]
}

export async function fetchDrop(id: string): Promise<Drop | null> {
  const { data } = await supabase.from('drops').select('id, name, starts_at').eq('id', id).maybeSingle()
  return data as Drop | null
}

export async function fetchMyReminder(dropId: string): Promise<boolean> {
  const { data } = await supabase.from('drop_reminders').select('drop_id').eq('drop_id', dropId)
  return (data ?? []).length > 0
}

export async function setReminder(dropId: string, on: boolean) {
  const { error } = on
    ? await supabase.from('drop_reminders').insert({ drop_id: dropId })
    : await supabase.from('drop_reminders').delete().eq('drop_id', dropId)
  if (error) throw new Error(error.message)
}

// ---- Admin ----

export async function fetchDrops(): Promise<Drop[]> {
  return unwrap(await supabase.from('drops').select('id, name, starts_at').order('starts_at', { ascending: false }))
}

export async function saveDrop(drop: { id?: string; name: string; starts_at: string }): Promise<string> {
  const row = { name: drop.name.trim(), starts_at: drop.starts_at }
  const result = drop.id
    ? await supabase.from('drops').update(row).eq('id', drop.id).select('id').single()
    : await supabase.from('drops').insert(row).select('id').single()
  return unwrap(result).id as string
}

export async function deleteDrop(id: string) {
  unwrap(await supabase.from('drops').delete().eq('id', id))
}

export async function setProductDrop(productId: string, dropId: string | null) {
  unwrap(await supabase.from('products').update({ drop_id: dropId }).eq('id', productId))
}

export type Reminder = {
  customer_id: string
  created_at: string
  notified_at: string | null
  customer: { username: string; mobile: string | null } | null
}

export async function fetchReminders(dropId: string): Promise<Reminder[]> {
  return unwrap(
    await supabase
      .from('drop_reminders')
      .select('customer_id, created_at, notified_at, customer:profiles(username, mobile)')
      .eq('drop_id', dropId)
      .order('created_at'),
  ) as unknown as Reminder[]
}

export async function markReminderSent(dropId: string, customerId: string) {
  unwrap(
    await supabase.from('drop_reminders').update({ notified_at: new Date().toISOString() }).eq('drop_id', dropId).eq('customer_id', customerId),
  )
}
