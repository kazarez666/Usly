import { supabase } from './supabase'

export type MoodKey = 'love' | 'happy' | 'calm' | 'sad' | 'angry' | 'miss'

export type Feeling = {
  id: string
  coupleId: string
  userId: string
  mood: string
  note: string | null
  updatedAt: string
}

export async function getCurrentFeelings(coupleId: string): Promise<Feeling[]> {
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

  return (data ?? []).map((row: {
    id: string; couple_id: string; user_id: string; mood: string; note: string | null; updated_at: string
  }) => ({
    id: row.id,
    coupleId: row.couple_id,
    userId: row.user_id,
    mood: row.mood,
    note: row.note,
    updatedAt: row.updated_at,
  }))
}

async function getSessionUserId(): Promise<string | null> {
  if (!supabase) return null
  // getSession() reads the already-restored browser session and avoids an
  // extra auth network request every time a view needs the current user id.
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
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }

  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'NOT_AUTHENTICATED' }

  const { error } = await supabase
    .from('couple_feelings')
    .upsert({
      couple_id: coupleId,
      user_id: userId,
      mood,
      note: note.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'couple_id,user_id' })

  return error ? { ok: false, error: error.message } : { ok: true }
}
