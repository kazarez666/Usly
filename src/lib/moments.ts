import { supabase } from './supabase'

export type Moment = {
  id: string
  coupleId: string
  userId: string
  title: string | null
  body: string | null
  imagePath: string | null
  imageUrl: string | null
  createdAt: string
}

type MomentCacheEntry = { rows: Moment[]; localFastPathUntil: number }
type SignedUrlCacheEntry = { url: string | null; expiresAt: number }

const momentCache = new Map<string, MomentCacheEntry>()
const momentRequests = new Map<string, Promise<Moment[]>>()
const signedUrlCache = new Map<string, SignedUrlCacheEntry>()
const SIGNED_URL_CACHE_MS = 50 * 60 * 1000
const LOCAL_MUTATION_FAST_PATH_MS = 1400

async function getSessionUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user) return null
  return data.session.user.id
}

async function signedMomentUrl(path: string): Promise<string | null> {
  if (!supabase) return null
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt > Date.now()) return cached.url

  const { data, error } = await supabase.storage.from('moments').createSignedUrl(path, 60 * 60)
  const url = error ? null : data?.signedUrl ?? null
  if (!error) signedUrlCache.set(path, { url, expiresAt: Date.now() + SIGNED_URL_CACHE_MS })
  return url
}

async function mapMomentRow(row: any): Promise<Moment> {
  let imageUrl: string | null = null
  if (row.image_path && supabase) imageUrl = await signedMomentUrl(row.image_path)
  return {
    id: row.id,
    coupleId: row.couple_id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    imagePath: row.image_path,
    imageUrl,
    createdAt: row.created_at,
  }
}

async function fetchMoments(coupleId: string): Promise<Moment[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('moments')
    .select('id, couple_id, user_id, title, body, image_path, created_at')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(120)

  if (error) {
    console.error('Failed to load moments:', error)
    return []
  }

  const rows = await Promise.all((data ?? []).map(mapMomentRow))
  momentCache.set(coupleId, { rows, localFastPathUntil: 0 })
  return rows
}

export function getMoments(coupleId: string): Promise<Moment[]> {
  const cached = momentCache.get(coupleId)
  if (cached && cached.localFastPathUntil > Date.now()) return Promise.resolve(cached.rows)

  const current = momentRequests.get(coupleId)
  if (current) return current

  let request: Promise<Moment[]>
  request = fetchMoments(coupleId).finally(() => {
    if (momentRequests.get(coupleId) === request) momentRequests.delete(coupleId)
  })
  momentRequests.set(coupleId, request)
  return request
}

export async function getLatestMoment(coupleId: string): Promise<Moment | null> {
  const cached = momentCache.get(coupleId)
  if (cached?.rows[0] && cached.localFastPathUntil > Date.now()) return cached.rows[0]
  if (!supabase) return null
  const { data, error } = await supabase
    .from('moments')
    .select('id, couple_id, user_id, title, body, image_path, created_at')
    .eq('couple_id', coupleId)
    .not('image_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to load latest moment:', error)
    return null
  }

  return data ? mapMomentRow(data) : null
}

export async function getMomentCount(coupleId: string): Promise<number> {
  const cached = momentCache.get(coupleId)
  if (cached && cached.localFastPathUntil > Date.now()) return cached.rows.filter(row => Boolean(row.imagePath)).length
  if (!supabase) return 0
  const { count, error } = await supabase
    .from('moments')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .not('image_path', 'is', null)

  if (error) {
    console.error('Failed to load moment count:', error)
    return 0
  }

  return count ?? 0
}

export async function createMoment(
  coupleId: string,
  title: string,
  body: string,
  file?: File | null,
): Promise<{ ok: boolean; moment?: Moment; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: 'NOT_AUTHENTICATED' }

  let imagePath: string | null = null

  if (file) {
    if (!file.type.startsWith('image/')) return { ok: false, error: 'IMAGE_ONLY' }
    if (file.size > 8 * 1024 * 1024) return { ok: false, error: 'IMAGE_TOO_LARGE' }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    imagePath = `${coupleId}/${userId}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage.from('moments').upload(imagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })
    if (uploadError) return { ok: false, error: uploadError.message }
  }

  const { data, error } = await supabase.from('moments').insert({
    couple_id: coupleId,
    user_id: userId,
    title: title.trim() || null,
    body: body.trim() || null,
    image_path: imagePath,
  }).select('id, couple_id, user_id, title, body, image_path, created_at').single()

  if (error || !data) {
    if (imagePath) await supabase.storage.from('moments').remove([imagePath])
    return { ok: false, error: error?.message ?? 'CREATE_FAILED' }
  }

  const moment = await mapMomentRow(data)
  const cached = momentCache.get(coupleId)
  const rows = cached
    ? [moment, ...cached.rows.filter(item => item.id !== moment.id)].slice(0, 120)
    : [moment]
  momentCache.set(coupleId, { rows, localFastPathUntil: Date.now() + LOCAL_MUTATION_FAST_PATH_MS })

  return { ok: true, moment }
}

export async function deleteMoment(moment: Moment): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { error } = await supabase.from('moments').delete().eq('id', moment.id)
  if (error) return { ok: false, error: error.message }
  if (moment.imagePath) await supabase.storage.from('moments').remove([moment.imagePath])
  const cached = momentCache.get(moment.coupleId)
  if (cached) momentCache.set(moment.coupleId, { rows: cached.rows.filter(item => item.id !== moment.id), localFastPathUntil: Date.now() + LOCAL_MUTATION_FAST_PATH_MS })
  return { ok: true }
}
