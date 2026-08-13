import { supabase } from './supabase'

export type SecretNote = {
  id: string
  coupleId: string
  createdBy: string
  title: string
  body: string
  createdAt: string
}

export type SecretDesire = {
  id: string
  coupleId: string
  createdBy: string
  title: string
  intensity: number
  createdAt: string
}

type NoteRow = { id?:string; couple_id?:string; created_by?:string; title?:string; body?:string; created_at?:string }
type DesireRow = { id?:string; couple_id?:string; created_by?:string; title?:string; intensity?:number; created_at?:string }

const normalizeRows = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data.filter(Boolean) as T[]
  if (data && typeof data === 'object') return [data as T]
  return []
}

const mapNote = (r: NoteRow): SecretNote | null => r.id ? ({ id:r.id, coupleId:r.couple_id ?? '', createdBy:r.created_by ?? '', title:r.title ?? '', body:r.body ?? '', createdAt:r.created_at ?? '' }) : null
const mapDesire = (r: DesireRow): SecretDesire | null => r.id ? ({ id:r.id, coupleId:r.couple_id ?? '', createdBy:r.created_by ?? '', title:r.title ?? '', intensity:Number(r.intensity ?? 1), createdAt:r.created_at ?? '' }) : null

export async function getSecretNotes(coupleId:string) {
  if (!supabase) return { ok:false, notes:[] as SecretNote[], error:'SUPABASE_MISSING' }
  const { data, error } = await supabase.rpc('get_my_secret_notes', { target_couple_id: coupleId })
  if (error) return { ok:false, notes:[] as SecretNote[], error:error.message }
  return { ok:true, notes:normalizeRows<NoteRow>(data).map(mapNote).filter((item): item is SecretNote => Boolean(item)) }
}

export async function createSecretNote(coupleId:string, title:string, body:string) {
  if (!supabase) return { ok:false, note:null as SecretNote|null, error:'SUPABASE_MISSING' }
  const { data, error } = await supabase.rpc('create_secret_note', { target_couple_id:coupleId, note_title:title.trim().slice(0,80), note_body:body.trim().slice(0,1000) })
  if (error) return { ok:false, note:null, error:error.message }
  return { ok:true, note:mapNote(data as NoteRow) }
}

export async function deleteSecretNote(noteId:string) {
  if (!supabase) return { ok:false, error:'SUPABASE_MISSING' }
  const { error } = await supabase.rpc('delete_secret_note', { target_note_id:noteId })
  return error ? { ok:false, error:error.message } : { ok:true }
}

export async function getSecretDesires(coupleId:string) {
  if (!supabase) return { ok:false, desires:[] as SecretDesire[], error:'SUPABASE_MISSING' }
  const { data, error } = await supabase.rpc('get_my_secret_desires', { target_couple_id:coupleId })
  if (error) return { ok:false, desires:[] as SecretDesire[], error:error.message }
  return { ok:true, desires:normalizeRows<DesireRow>(data).map(mapDesire).filter((item): item is SecretDesire => Boolean(item)) }
}

export async function createSecretDesire(coupleId:string, title:string, intensity:number) {
  if (!supabase) return { ok:false, desire:null as SecretDesire|null, error:'SUPABASE_MISSING' }
  const { data, error } = await supabase.rpc('create_secret_desire', { target_couple_id:coupleId, desire_title:title.trim().slice(0,100), desire_intensity:Math.max(1, Math.min(10, intensity)) })
  if (error) return { ok:false, desire:null, error:error.message }
  return { ok:true, desire:mapDesire(data as DesireRow) }
}

export async function deleteSecretDesire(desireId:string) {
  if (!supabase) return { ok:false, error:'SUPABASE_MISSING' }
  const { error } = await supabase.rpc('delete_secret_desire', { target_desire_id:desireId })
  return error ? { ok:false, error:error.message } : { ok:true }
}
