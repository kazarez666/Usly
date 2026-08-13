import { supabase } from './supabase'

export type RoomPasswordKind = 'secret' | 'truth'

export async function roomPasswordExists(coupleId: string, room: RoomPasswordKind) {
  if (!supabase) return { ok: false, exists: false, error: 'SUPABASE_MISSING' }
  const { data, error } = await supabase.rpc('room_password_exists', { target_couple_id: coupleId, target_room: room })
  if (error) return { ok: false, exists: false, error: error.message }
  return { ok: true, exists: Boolean(data) }
}

export async function setRoomPassword(coupleId: string, room: RoomPasswordKind, password: string) {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const value = password.trim()
  if (value.length < 4) return { ok: false, error: 'PASSWORD_TOO_SHORT' }
  const { error } = await supabase.rpc('set_room_password', { target_couple_id: coupleId, target_room: room, new_password: value })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function verifyRoomPassword(coupleId: string, room: RoomPasswordKind, password: string) {
  if (!supabase) return { ok: false, valid: false, error: 'SUPABASE_MISSING' }
  const { data, error } = await supabase.rpc('verify_room_password', { target_couple_id: coupleId, target_room: room, candidate_password: password })
  if (error) return { ok: false, valid: false, error: error.message }
  return { ok: true, valid: Boolean(data) }
}
