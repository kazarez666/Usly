import { supabase } from './supabase'

export type Message = {
  id: string
  coupleId: string
  senderId: string
  body: string
  createdAt: string
  readAt: string | null
  mediaType: 'video' | null
  mediaUrl: string | null
  mediaPath: string | null
  durationMs: number | null
}

async function mapRow(row: any): Promise<Message> {
  let mediaUrl: string | null = null
  if (row.media_type === 'video' && row.media_path && supabase) {
    const { data } = await supabase.storage.from('chat-media').createSignedUrl(row.media_path, 60 * 60)
    mediaUrl = data?.signedUrl ?? null
  }
  return {
    id: row.id, coupleId: row.couple_id, senderId: row.sender_id, body: row.body,
    createdAt: row.created_at, readAt: row.read_at, mediaType: row.media_type ?? null,
    mediaUrl, mediaPath: row.media_path ?? null, durationMs: row.duration_ms ?? null,
  }
}

export async function getMessages(coupleId: string): Promise<Message[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('messages')
    .select('id, couple_id, sender_id, body, created_at, read_at, media_type, media_path, duration_ms')
    .eq('couple_id', coupleId).order('created_at', { ascending: true }).limit(300)
  if (error) { console.error('Failed to load messages:', error); return [] }
  return Promise.all((data ?? []).map(mapRow))
}


export async function sendMessage(coupleId: string, body: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return { ok: false, error: 'NOT_AUTHENTICATED' }

  const text = body.trim()
  if (!text) return { ok: false, error: 'EMPTY_MESSAGE' }
  if (text.length > 2000) return { ok: false, error: 'MESSAGE_TOO_LONG' }

  const { error } = await supabase.from('messages').insert({
    couple_id: coupleId,
    sender_id: userData.user.id,
    body: text,
  })

  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function sendVideoMessage(coupleId: string, blob: Blob, durationMs: number): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return { ok: false, error: 'NOT_AUTHENTICATED' }
  if (blob.size > 20 * 1024 * 1024) return { ok: false, error: 'VIDEO_TOO_LARGE' }
  const path = `${userData.user.id}/${crypto.randomUUID()}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`
  const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, blob, { contentType: blob.type || 'video/webm', cacheControl: '3600', upsert: false })
  if (uploadError) return { ok: false, error: uploadError.message }
  const { error } = await supabase.from('messages').insert({ couple_id: coupleId, sender_id: userData.user.id, body: '', media_type: 'video', media_path: path, duration_ms: Math.min(Math.round(durationMs), 20000) })
  if (error) { await supabase.storage.from('chat-media').remove([path]); return { ok: false, error: error.message } }
  return { ok: true }
}

export async function deleteMessage(message: Message): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user || message.senderId !== userData.user.id) return { ok: false, error: 'NOT_ALLOWED' }
  const { error } = await supabase.from('messages').delete().eq('id', message.id).eq('sender_id', userData.user.id)
  if (error) return { ok: false, error: error.message }
  if (message.mediaPath) await supabase.storage.from('chat-media').remove([message.mediaPath])
  return { ok: true }
}

export async function markMessagesRead(coupleId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return { ok: false, error: 'NOT_AUTHENTICATED' }

  const { error } = await supabase.rpc('mark_messages_read', { p_couple_id: coupleId })

  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function getUnreadCount(coupleId: string): Promise<number> {
  if (!supabase) return 0
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return 0

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .neq('sender_id', userData.user.id)
    .is('read_at', null)

  if (error) {
    console.error('Failed to load unread count:', error)
    return 0
  }
  return count ?? 0
}

export async function getMessageCount(coupleId: string): Promise<number> {
  if (!supabase) return 0

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)

  if (error) {
    console.error('Failed to load message count:', error)
    return 0
  }

  return count ?? 0
}
