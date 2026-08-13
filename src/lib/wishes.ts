import { supabase } from './supabase'

export type WishStatus = 'open' | 'done'
export type Wish = {
  id: string
  coupleId: string
  createdBy: string
  title: string
  note: string | null
  joinedBy: string | null
  status: WishStatus
  createdAt: string
  completedAt: string | null
}

type RpcWish = {
  id: string
  couple_id: string
  created_by: string
  title: string
  note: string | null
  joined_by: string | null
  status: WishStatus
  created_at: string
  completed_at: string | null
}

const mapWish = (row: RpcWish): Wish => ({
  id: row.id,
  coupleId: row.couple_id,
  createdBy: row.created_by,
  title: row.title,
  note: row.note,
  joinedBy: row.joined_by,
  status: row.status,
  createdAt: row.created_at,
  completedAt: row.completed_at,
})

export async function getWishes(coupleId: string): Promise<{ ok: boolean; wishes: Wish[]; error?: string }> {
  if (!supabase) return { ok: false, wishes: [], error: 'SUPABASE_MISSING' }
  const { data, error } = await supabase.rpc('get_my_wishes', { target_couple_id: coupleId })
  if (error) return { ok: false, wishes: [], error: error.message }
  return { ok: true, wishes: (Array.isArray(data) ? data : data ? [data] : []).map(mapWish) }
}

export async function createWish(coupleId: string, title: string, note: string): Promise<{ ok: boolean; wish: Wish | null; error?: string }> {
  if (!supabase) return { ok: false, wish: null, error: 'SUPABASE_MISSING' }
  const { data, error } = await supabase.rpc('create_wish', {
    target_couple_id: coupleId,
    wish_title: title.trim().slice(0, 100),
    wish_note: note.trim().slice(0, 300) || null,
  })
  if (error) return { ok: false, wish: null, error: error.message }
  return { ok: true, wish: data ? mapWish(data as RpcWish) : null }
}

export async function joinWish(wishId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { error } = await supabase.rpc('join_wish', { target_wish_id: wishId })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function completeWish(wishId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { error } = await supabase.rpc('complete_wish', { target_wish_id: wishId })
  return error ? { ok: false, error: error.message } : { ok: true }
}


export async function deleteWish(wishId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { error } = await supabase.rpc('delete_wish', { target_wish_id: wishId })
  return error ? { ok: false, error: error.message } : { ok: true }
}
