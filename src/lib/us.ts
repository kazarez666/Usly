import { supabase } from './supabase'

export type UsPerson = {
  userId: string
  displayName: string
  avatarUrl: string | null
  backgroundUrl: string | null
  gender: 'male' | 'female' | null
  zodiac: string | null
  joinedAt: string
  isMe: boolean
}

export type UsSpace = {
  coupleName: string
  relationshipStartedAt: string | null
  people: UsPerson[]
}

type RpcPerson = {
  user_id: string
  display_name: string
  avatar_url: string | null
  background_url: string | null
  gender: 'male' | 'female' | null
  zodiac: string | null
  joined_at: string
  is_me: boolean
}

type RpcSpace = RpcPerson & {
  couple_name: string
  relationship_started_at: string | null
}

async function signedAsset(bucket: string, path: string | null): Promise<string | null> {
  if (!supabase || !path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60)
  return data?.signedUrl ?? null
}


export async function getUsSpace(coupleId: string): Promise<{ ok: boolean; space: UsSpace | null; error?: string }> {
  if (!supabase) return { ok: false, space: null, error: 'SUPABASE_MISSING' }

  const { data, error } = await supabase.rpc('get_my_us', { target_couple_id: coupleId })
  if (error) return { ok: false, space: null, error: error.message }

  const rows = (Array.isArray(data) ? data : data ? [data] : []) as RpcSpace[]
  if (!rows.length) return { ok: true, space: null }

  return {
    ok: true,
    space: {
      coupleName: rows[0].couple_name || 'Наше «мы»',
      relationshipStartedAt: rows[0].relationship_started_at,
      people: await Promise.all(rows.map(async row => ({
        userId: row.user_id,
        displayName: row.display_name || '',
        avatarUrl: await signedAsset('avatars', row.avatar_url),
        backgroundUrl: await signedAsset('profile-backgrounds', row.background_url),
        gender: row.gender,
        zodiac: row.zodiac,
        joinedAt: row.joined_at,
        isMe: row.is_me,
      }))),
    },
  }
}

export type ProfileGender = 'male' | 'female'

export async function updateMyProfile(
  displayName: string,
  avatarFile?: File | null,
  gender?: ProfileGender | null,
  zodiac?: string | null,
  backgroundFile?: File | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const clean = displayName.trim().slice(0, 40)
  if (!clean) return { ok: false, error: 'EMPTY_NAME' }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return { ok: false, error: 'NOT_AUTHENTICATED' }
  const userId = userData.user.id
  let avatarPath: string | null = null
  let backgroundPath: string | null = null

  const uploadAsset = async (bucket: string, file: File, maxBytes: number, folder: string) => {
    if (!file.type.startsWith('image/')) throw new Error('IMAGE_ONLY')
    if (file.size > maxBytes) throw new Error('IMAGE_TOO_LARGE')
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userId}/${folder}-${crypto.randomUUID()}.${extension}`
    const { error } = await supabase!.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (error) throw new Error(error.message)
    return path
  }

  try {
    if (avatarFile) avatarPath = await uploadAsset('avatars', avatarFile, 5 * 1024 * 1024, 'avatar')
    if (backgroundFile) backgroundPath = await uploadAsset('profile-backgrounds', backgroundFile, 8 * 1024 * 1024, 'background')
  } catch (error) {
    if (avatarPath) await supabase.storage.from('avatars').remove([avatarPath])
    if (backgroundPath) await supabase.storage.from('profile-backgrounds').remove([backgroundPath])
    return { ok: false, error: error instanceof Error ? error.message : 'UPLOAD_FAILED' }
  }

  const updates: Record<string, string | null> = { display_name: clean }
  if (avatarPath) updates.avatar_url = avatarPath
  if (backgroundPath) updates.background_url = backgroundPath
  if (gender === 'male' || gender === 'female') updates.gender = gender
  if (gender === null) updates.gender = null
  if (zodiac !== undefined) updates.zodiac = zodiac || null
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) {
    if (avatarPath) await supabase.storage.from('avatars').remove([avatarPath])
    if (backgroundPath) await supabase.storage.from('profile-backgrounds').remove([backgroundPath])
    return { ok: false, error: error.message }
  }

  return { ok: true }
}


export async function updateUsSettings(coupleId: string, coupleName: string, startedAt: string | null): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const cleanName = coupleName.trim().slice(0, 60)
  if (!cleanName) return { ok: false, error: 'EMPTY_COUPLE_NAME' }

  const { error } = await supabase.rpc('update_my_us', {
    target_couple_id: coupleId,
    new_couple_name: cleanName,
    new_started_at: startedAt || null,
  })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function leaveCouple(coupleId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { error } = await supabase.rpc('leave_couple', { target_couple_id: coupleId })
  return error ? { ok: false, error: error.message } : { ok: true }
}
