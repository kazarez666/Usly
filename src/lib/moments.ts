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

export async function getMoments(coupleId: string): Promise<Moment[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('moments')
    .select('id, couple_id, user_id, title, body, image_path, created_at')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load moments:', error)
    return []
  }

  const rows = data ?? []
  const withUrls = await Promise.all(rows.map(async (row: any) => {
    let imageUrl: string | null = null
    if (row.image_path) {
      const { data: signed } = await supabase!.storage.from('moments').createSignedUrl(row.image_path, 60 * 60)
      imageUrl = signed?.signedUrl ?? null
    }
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
  }))

  return withUrls
}

export async function createMoment(
  coupleId: string,
  title: string,
  body: string,
  file?: File | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return { ok: false, error: 'NOT_AUTHENTICATED' }

  const userId = userData.user.id
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

  const { error } = await supabase.from('moments').insert({
    couple_id: coupleId,
    user_id: userId,
    title: title.trim() || null,
    body: body.trim() || null,
    image_path: imagePath,
  })

  if (error) {
    if (imagePath) await supabase.storage.from('moments').remove([imagePath])
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

export async function deleteMoment(moment: Moment): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { error } = await supabase.from('moments').delete().eq('id', moment.id)
  if (error) return { ok: false, error: error.message }
  if (moment.imagePath) await supabase.storage.from('moments').remove([moment.imagePath])
  return { ok: true }
}
