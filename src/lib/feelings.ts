import { supabase } from './supabase'
import { sendPartnerPush } from './push'

export type MoodKey = 'love' | 'happy' | 'calm' | 'sad' | 'angry' | 'miss'

export type Feeling = {
  id: string
  coupleId: string
  userId: string
  mood: string
  note: string | null
  updatedAt: string
}

type FeelingRow = {
  id: string
  couple_id: string
  user_id: string
  mood: string
  note: string | null
  updated_at: string
}

const feelingsInFlight = new Map<string, Promise<Feeling[]>>()
const feelingsCache = new Map<string, { rows: Feeling[]; localFastPathUntil: number }>()
const LOCAL_MUTATION_FAST_PATH_MS = 900

const mapFeeling = (row: FeelingRow): Feeling => ({
  id: row.id,
  coupleId: row.couple_id,
  userId: row.user_id,
  mood: row.mood,
  note: row.note,
  updatedAt: row.updated_at,
})

function feelingLabel(mood: string): string {
  switch (mood) {
    case 'love': return 'Влюблён(а) ❤️'
    case 'happy': return 'Счастлив(а) 😊'
    case 'calm': return 'Спокойно 😌'
    case 'sad': return 'Грустно 😔'
    case 'angry': return 'Злюсь 😡'
    case 'miss': return 'Скучаю 🥺'
    default: return mood
  }
}

async function fetchCurrentFeelings(coupleId: string): Promise<Feeling[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('couple_feelings')
    .select('id, couple_id, user_id, mood, note, updated_at')
    .eq('couple_id', coupleId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Failed to load current feelings:', error)
    return []
  }

  const rows = (data ?? []).map((row) => mapFeeling(row as FeelingRow))
  feelingsCache.set(coupleId, { rows, localFastPathUntil: 0 })
  return rows
}

export function getCurrentFeelings(coupleId: string): Promise<Feeling[]> {
  const cached = feelingsCache.get(coupleId)
  if (cached && cached.localFastPathUntil > Date.now()) return Promise.resolve(cached.rows)

  const current = feelingsInFlight.get(coupleId)
  if (current) return current

  let request: Promise<Feeling[]>
  request = fetchCurrentFeelings(coupleId).finally(() => {
    if (feelingsInFlight.get(coupleId) === request) feelingsInFlight.delete(coupleId)
  })
  feelingsInFlight.set(coupleId, request)
  return request
}

async function getSessionUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user) return null
  return data.session.user.id
}

export async function getMyUserId(): Promise<string | null> {
  return getSessionUserId()
}

export async function saveFeeling(
  coupleId: string,
  mood: string,
  note: string,
): Promise<{ ok: boolean; feeling?: Feeling; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }

  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'NOT_AUTHENTICATED' }

  const { data, error } = await supabase
    .from('couple_feelings')
    .upsert({
      couple_id: coupleId,
      user_id: userId,
      mood,
      note: note.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'couple_id,user_id' })
    .select('id, couple_id, user_id, mood, note, updated_at')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'SAVE_FAILED' }

  const feeling = mapFeeling(data as FeelingRow)
  const cached = feelingsCache.get(coupleId)
  const rows = cached
    ? [feeling, ...cached.rows.filter(item => item.userId !== userId)]
    : [feeling]
  feelingsCache.set(coupleId, { rows, localFastPathUntil: Date.now() + LOCAL_MUTATION_FAST_PATH_MS })

  void sendPartnerPush(coupleId, {
    type: 'feeling',
    title: 'Партнёр изменил чувство',
    body: note.trim() ? `${feelingLabel(mood)} · ${note.trim().slice(0, 120)}` : feelingLabel(mood),
    entityId: feeling.id,
  })

  return { ok: true, feeling }
}
