import { supabase } from './supabase'

export type Desire = {
  id: string
  coupleId: string
  userId: string
  desire: string
  intensity: number
  updatedAt: string
}

function map(row: any): Desire {
  return { id: row.id, coupleId: row.couple_id, userId: row.user_id, desire: row.desire, intensity: row.intensity, updatedAt: row.updated_at }
}

export async function getMyDesire(coupleId: string): Promise<Desire | null> {
  if (!supabase) return null
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return null
  const { data, error } = await supabase.from('couple_desires').select('*').eq('couple_id', coupleId).eq('user_id', user.user.id).maybeSingle()
  if (error) return null
  return data ? map(data) : null
}

export async function getPartnerDesire(coupleId: string): Promise<Desire | null> {
  if (!supabase) return null
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return null
  const { data, error } = await supabase.from('couple_desires').select('*').eq('couple_id', coupleId).neq('user_id', user.user.id).maybeSingle()
  if (error) return null
  return data ? map(data) : null
}

export async function saveMyDesire(coupleId: string, desire: string, intensity: number) {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' as string }
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return { ok: false, error: 'NOT_AUTHENTICATED' as string }
  const { data, error } = await supabase.from('couple_desires').upsert({ couple_id: coupleId, user_id: user.user.id, desire, intensity, updated_at: new Date().toISOString() }, { onConflict: 'couple_id,user_id' }).select().single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, desire: map(data) }
}
