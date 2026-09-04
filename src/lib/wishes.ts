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

type WishesResult = { ok: boolean; wishes: Wish[]; error?: string }
type WishesCacheEntry = { result: WishesResult; localFastPathUntil: number }

const wishesInFlight = new Map<string, Promise<WishesResult>>()
const wishesCache = new Map<string, WishesCacheEntry>()
const LOCAL_MUTATION_FAST_PATH_MS = 1400

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

async function getSessionUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user) return null
  return data.session.user.id
}

function updateCachedWish(wishId: string, updater: (wish: Wish) => Wish | null) {
  for (const [coupleId, entry] of wishesCache) {
    let touched = false
    const wishes = entry.result.wishes.flatMap(wish => {
      if (wish.id !== wishId) return [wish]
      touched = true
      const updated = updater(wish)
      return updated ? [updated] : []
    })
    if (touched) {
      wishesCache.set(coupleId, {
        result: { ...entry.result, wishes },
        localFastPathUntil: Date.now() + LOCAL_MUTATION_FAST_PATH_MS,
      })
    }
  }
}

async function fetchWishes(coupleId: string): Promise<WishesResult> {
  if (!supabase) return { ok: false, wishes: [], error: 'SUPABASE_MISSING' }
  const { data, error } = await supabase.rpc('get_my_wishes', { target_couple_id: coupleId })
  if (error) return { ok: false, wishes: [], error: error.message }
  const result = { ok: true, wishes: (Array.isArray(data) ? data : data ? [data] : []).map(mapWish) }
  wishesCache.set(coupleId, { result, localFastPathUntil: 0 })
  return result
}

export function getWishes(coupleId: string): Promise<WishesResult> {
  const cached = wishesCache.get(coupleId)
  if (cached && cached.localFastPathUntil > Date.now()) return Promise.resolve(cached.result)

  const current = wishesInFlight.get(coupleId)
  if (current) return current

  let request: Promise<WishesResult>
  request = fetchWishes(coupleId).finally(() => {
    if (wishesInFlight.get(coupleId) === request) wishesInFlight.delete(coupleId)
  })
  wishesInFlight.set(coupleId, request)
  return request
}

export async function createWish(coupleId: string, title: string, note: string): Promise<{ ok: boolean; wish: Wish | null; error?: string }> {
  if (!supabase) return { ok: false, wish: null, error: 'SUPABASE_MISSING' }
  const { data, error } = await supabase.rpc('create_wish', {
    target_couple_id: coupleId,
    wish_title: title.trim().slice(0, 100),
    wish_note: note.trim().slice(0, 300) || null,
  })
  if (error) return { ok: false, wish: null, error: error.message }

  const wish = data ? mapWish(data as RpcWish) : null
  if (wish) {
    const cached = wishesCache.get(coupleId)
    const wishes = cached
      ? [wish, ...cached.result.wishes.filter(item => item.id !== wish.id)]
      : [wish]
    wishesCache.set(coupleId, {
      result: { ok: true, wishes },
      localFastPathUntil: Date.now() + LOCAL_MUTATION_FAST_PATH_MS,
    })
  }

  return { ok: true, wish }
}

export async function joinWish(wishId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const userId = await getSessionUserId()
  const { error } = await supabase.rpc('join_wish', { target_wish_id: wishId })
  if (error) return { ok: false, error: error.message }
  if (userId) updateCachedWish(wishId, wish => ({ ...wish, joinedBy: userId }))
  return { ok: true }
}

export async function completeWish(wishId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { error } = await supabase.rpc('complete_wish', { target_wish_id: wishId })
  if (error) return { ok: false, error: error.message }
  updateCachedWish(wishId, wish => ({ ...wish, status: 'done', completedAt: new Date().toISOString() }))
  return { ok: true }
}

export async function deleteWish(wishId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { error } = await supabase.rpc('delete_wish', { target_wish_id: wishId })
  if (error) return { ok: false, error: error.message }
  updateCachedWish(wishId, () => null)
  return { ok: true }
}
