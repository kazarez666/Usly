import { supabase } from './supabase'

export type Desire = {
  id: string
  coupleId: string
  userId: string
  desire: string
  intensity: number
  updatedAt: string
}

type DesireRow = {
  id: string
  couple_id: string
  user_id: string
  desire: string
  intensity: number
  updated_at: string
}

const desireRequests = new Map<string, Promise<Desire[]>>()
const desireCache = new Map<string, { rows: Desire[]; localFastPathUntil: number }>()
const LOCAL_MUTATION_FAST_PATH_MS = 900

function map(row: DesireRow): Desire {
  return { id: row.id, coupleId: row.couple_id, userId: row.user_id, desire: row.desire, intensity: row.intensity, updatedAt: row.updated_at }
}

async function getSessionUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user) return null
  return data.session.user.id
}

async function fetchDesires(coupleId: string): Promise<Desire[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('couple_desires')
    .select('id, couple_id, user_id, desire, intensity, updated_at')
    .eq('couple_id', coupleId)
  if (error) return []
  const rows = (data ?? []).map(row => map(row as DesireRow))
  desireCache.set(coupleId, { rows, localFastPathUntil: 0 })
  return rows
}

function getDesires(coupleId: string): Promise<Desire[]> {
  const cached = desireCache.get(coupleId)
  if (cached && cached.localFastPathUntil > Date.now()) return Promise.resolve(cached.rows)

  const current = desireRequests.get(coupleId)
  if (current) return current

  let request: Promise<Desire[]>
  request = fetchDesires(coupleId).finally(() => {
    if (desireRequests.get(coupleId) === request) desireRequests.delete(coupleId)
  })
  desireRequests.set(coupleId, request)
  return request
}

export async function getMyDesire(coupleId: string): Promise<Desire | null> {
  const userId = await getSessionUserId()
  if (!userId) return null
  const rows = await getDesires(coupleId)
  return rows.find(row => row.userId === userId) ?? null
}

export async function getPartnerDesire(coupleId: string): Promise<Desire | null> {
  const userId = await getSessionUserId()
  if (!userId) return null
  const rows = await getDesires(coupleId)
  return rows.find(row => row.userId !== userId) ?? null
}

export async function saveMyDesire(coupleId: string, desire: string, intensity: number) {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' as string }
  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'NOT_AUTHENTICATED' as string }
  const { data, error } = await supabase.from('couple_desires').upsert({ couple_id: coupleId, user_id: userId, desire, intensity, updated_at: new Date().toISOString() }, { onConflict: 'couple_id,user_id' }).select('id, couple_id, user_id, desire, intensity, updated_at').single()
  if (error || !data) return { ok: false, error: error?.message ?? 'SAVE_FAILED' }

  const saved = map(data as DesireRow)
  const cached = desireCache.get(coupleId)
  const rows = cached
    ? [saved, ...cached.rows.filter(item => item.userId !== userId)]
    : [saved]
  desireCache.set(coupleId, { rows, localFastPathUntil: Date.now() + LOCAL_MUTATION_FAST_PATH_MS })

  return { ok: true, desire: saved }
}
