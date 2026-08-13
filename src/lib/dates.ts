import { supabase } from './supabase'

export type CoupleDate = {
  id: string
  coupleId: string
  title: string
  date: string
  kind: 'anniversary' | 'birthday' | 'other'
  createdAt: string
}

type Row = {
  id: string
  couple_id: string
  title: string
  date: string
  kind: CoupleDate['kind']
  created_at: string
}

const map = (row: Row): CoupleDate => ({ id: row.id, coupleId: row.couple_id, title: row.title, date: row.date, kind: row.kind, createdAt: row.created_at })

export async function getCoupleDates(coupleId: string): Promise<{ ok: boolean; dates: CoupleDate[]; error?: string }> {
  if (!supabase) return { ok: false, dates: [], error: 'SUPABASE_MISSING' }
  const { data, error } = await supabase.from('couple_dates').select('*').eq('couple_id', coupleId).order('date', { ascending: true })
  if (error) return { ok: false, dates: [], error: error.message }
  return { ok: true, dates: (data as Row[]).map(map) }
}

export async function createCoupleDate(coupleId: string, title: string, date: string, kind: CoupleDate['kind']) {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { error } = await supabase.rpc('create_couple_date', { target_couple_id: coupleId, input_title: title, input_date: date, input_kind: kind })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function deleteCoupleDate(id: string) {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { error } = await supabase.rpc('delete_couple_date', { target_date_id: id })
  return error ? { ok: false, error: error.message } : { ok: true }
}
