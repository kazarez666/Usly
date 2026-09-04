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

type MessageCacheEntry = { rows: Message[]; localFastPathUntil: number }
type SignedUrlCacheEntry = { url: string | null; expiresAt: number }

const messageCache = new Map<string, MessageCacheEntry>()
const messageRequests = new Map<string, Promise<Message[]>>()
const signedUrlCache = new Map<string, SignedUrlCacheEntry>()
const SIGNED_URL_CACHE_MS = 50 * 60 * 1000
const LOCAL_MUTATION_FAST_PATH_MS = 1400

async function getSessionUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user) return null
  return data.session.user.id
}

async function signedMediaUrl(path: string): Promise<string | null> {
  if (!supabase) return null
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt > Date.now()) return cached.url

  const { data, error } = await supabase.storage.from('chat-media').createSignedUrl(path, 60 * 60)
  const url = error ? null : data?.signedUrl ?? null
  if (!error) signedUrlCache.set(path, { url, expiresAt: Date.now() + SIGNED_URL_CACHE_MS })
  return url
}

async function mapRow(row: any): Promise<Message> {
  let mediaUrl: string | null = null
  if (row.media_type === 'video' && row.media_path && supabase) {
    mediaUrl = await signedMediaUrl(row.media_path)
  }
  return {
    id: row.id, coupleId: row.couple_id, senderId: row.sender_id, body: row.body,
    createdAt: row.created_at, readAt: row.read_at, mediaType: row.media_type ?? null,
    mediaUrl, mediaPath: row.media_path ?? null, durationMs: row.duration_ms ?? null,
  }
}

async function fetchMessages(coupleId: string): Promise<Message[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('messages')
    .select('id, couple_id, sender_id, body, created_at, read_at, media_type, media_path, duration_ms')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: true })
    .limit(180)
  if (error) { console.error('Failed to load messages:', error); return [] }
  const rows = await Promise.all((data ?? []).map(mapRow))
  messageCache.set(coupleId, { rows, localFastPathUntil: 0 })
  return rows
}

export function getMessages(coupleId: string): Promise<Message[]> {
  const cached = messageCache.get(coupleId)
  if (cached && cached.localFastPathUntil > Date.now()) {
    return Promise.resolve(cached.rows)
  }

  const current = messageRequests.get(coupleId)
  if (current) return current

  let request: Promise<Message[]>
  request = fetchMessages(coupleId).finally(() => {
    if (messageRequests.get(coupleId) === request) messageRequests.delete(coupleId)
  })
  messageRequests.set(coupleId, request)
  return request
}

export async function getLatestMessage(coupleId: string): Promise<Message | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('messages')
    .select('id, couple_id, sender_id, body, created_at, read_at, media_type, media_path, duration_ms')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to load latest message:', error)
    return null
  }

  return data ? mapRow(data) : null
}

export async function sendMessage(coupleId: string, body: string): Promise<{ ok: boolean; message?: Message; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'NOT_AUTHENTICATED' }

  const text = body.trim()
  if (!text) return { ok: false, error: 'EMPTY_MESSAGE' }
  if (text.length > 2000) return { ok: false, error: 'MESSAGE_TOO_LONG' }

  const { data, error } = await supabase.from('messages').insert({
    couple_id: coupleId,
    sender_id: userId,
    body: text,
  }).select('id, couple_id, sender_id, body, created_at, read_at, media_type, media_path, duration_ms').single()

  if (error || !data) return { ok: false, error: error?.message ?? 'SEND_FAILED' }

  const message = await mapRow(data)
  const cached = messageCache.get(coupleId)
  if (cached) {
    const rows = cached.rows.some(item => item.id === message.id)
      ? cached.rows
      : [...cached.rows, message].slice(-180)
    messageCache.set(coupleId, { rows, localFastPathUntil: Date.now() + LOCAL_MUTATION_FAST_PATH_MS })
  } else {
    messageCache.set(coupleId, { rows: [message], localFastPathUntil: Date.now() + LOCAL_MUTATION_FAST_PATH_MS })
  }

  return { ok: true, message }
}

export async function sendVideoMessage(coupleId: string, blob: Blob, durationMs: number): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'NOT_AUTHENTICATED' }
  if (blob.size > 20 * 1024 * 1024) return { ok: false, error: 'VIDEO_TOO_LARGE' }
  const path = `${userId}/${crypto.randomUUID()}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`
  const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, blob, { contentType: blob.type || 'video/webm', cacheControl: '3600', upsert: false })
  if (uploadError) return { ok: false, error: uploadError.message }
  const { error } = await supabase.from('messages').insert({ couple_id: coupleId, sender_id: userId, body: '', media_type: 'video', media_path: path, duration_ms: Math.min(Math.round(durationMs), 20000) })
  if (error) { await supabase.storage.from('chat-media').remove([path]); return { ok: false, error: error.message } }
  return { ok: true }
}

export async function deleteMessage(message: Message): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const userId = await getSessionUserId()
  if (!userId || message.senderId !== userId) return { ok: false, error: 'NOT_ALLOWED' }
  const { error } = await supabase.from('messages').delete().eq('id', message.id).eq('sender_id', userId)
  if (error) return { ok: false, error: error.message }
  if (message.mediaPath) await supabase.storage.from('chat-media').remove([message.mediaPath])
  const cached = messageCache.get(message.coupleId)
  if (cached) messageCache.set(message.coupleId, { rows: cached.rows.filter(item => item.id !== message.id), localFastPathUntil: Date.now() + LOCAL_MUTATION_FAST_PATH_MS })
  return { ok: true }
}

export async function markMessagesRead(coupleId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'NOT_AUTHENTICATED' }

  const { error } = await supabase.rpc('mark_messages_read', { p_couple_id: coupleId })

  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function getUnreadCount(coupleId: string): Promise<number> {
  if (!supabase) return 0
  const userId = await getSessionUserId()
  if (!userId) return 0

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .neq('sender_id', userId)
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
