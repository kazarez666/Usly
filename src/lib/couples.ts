import { supabase } from './supabase'

export type CoupleSummary = {
  id: string
  inviteCode: string
  memberCount: number
  createdAt: string
}

type RpcResult = {
  couple_id: string
  invite_code: string
}

function normalize(data: RpcResult | RpcResult[] | null): RpcResult | null {
  if (!data) return null
  return Array.isArray(data) ? data[0] ?? null : data
}

async function getSummary(
  coupleId: string,
  inviteCode?: string,
): Promise<CoupleSummary | null> {
  if (!supabase) return null

  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .select('id, invite_code, created_at')
    .eq('id', coupleId)
    .single()

  if (coupleError || !couple) return null

  const { count } = await supabase
    .from('couple_members')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)

  return {
    id: couple.id,
    inviteCode: inviteCode ?? couple.invite_code,
    memberCount: count ?? 0,
    createdAt: couple.created_at,
  }
}

export async function getMyCouple(): Promise<{
  ok: boolean
  couple: CoupleSummary | null
  error?: string
}> {
  if (!supabase) {
    return {
      ok: false,
      couple: null,
      error: 'SUPABASE_MISSING',
    }
  }

  const { data: membership, error } = await supabase
    .from('couple_members')
    .select('couple_id')
    .limit(1)
    .maybeSingle()

  if (error) {
    return {
      ok: false,
      couple: null,
      error: error.message,
    }
  }

  if (!membership) {
    return {
      ok: true,
      couple: null,
    }
  }

  const couple = await getSummary(membership.couple_id)

  return {
    ok: true,
    couple,
  }
}

export async function createCouple(): Promise<{
  ok: boolean
  couple: CoupleSummary | null
  error?: string
}> {
  if (!supabase) {
    return {
      ok: false,
      couple: null,
      error: 'SUPABASE_MISSING',
    }
  }

  const { data, error } = await supabase.rpc('create_couple')

  if (error) {
    return {
      ok: false,
      couple: null,
      error: error.message,
    }
  }

  const result = normalize(data as RpcResult | RpcResult[] | null)

  if (!result) {
    return {
      ok: false,
      couple: null,
      error: 'CREATE_FAILED',
    }
  }

  const couple = await getSummary(
    result.couple_id,
    result.invite_code,
  )

  if (couple) {
    return {
      ok: true,
      couple,
    }
  }

  // The database RPC already succeeded, so the couple exists.
  // Do not show a false CREATE_FAILED if the immediate follow-up read
  // is temporarily unavailable.
  return {
    ok: true,
    couple: {
      id: result.couple_id,
      inviteCode: result.invite_code,
      memberCount: 1,
      createdAt: new Date().toISOString(),
    },
  }
}

export async function joinCouple(inviteCode: string): Promise<{
  ok: boolean
  couple: CoupleSummary | null
  error?: string
}> {
  if (!supabase) {
    return {
      ok: false,
      couple: null,
      error: 'SUPABASE_MISSING',
    }
  }

  const { data, error } = await supabase.rpc('join_couple', {
    input_invite_code: inviteCode.trim().toUpperCase(),
  })

  if (error) {
    const message = error.message.toLowerCase()

    if (message.includes('full')) {
      return {
        ok: false,
        couple: null,
        error: 'COUPLE_FULL',
      }
    }

    return {
      ok: false,
      couple: null,
      error: error.message,
    }
  }

  const result = normalize(data as RpcResult | RpcResult[] | null)

  if (!result) {
    return {
      ok: false,
      couple: null,
      error: 'JOIN_FAILED',
    }
  }

  const couple = await getSummary(
    result.couple_id,
    result.invite_code,
  )

  if (couple) {
    return {
      ok: true,
      couple,
    }
  }

  // Joining already succeeded in the database.
  return {
    ok: true,
    couple: {
      id: result.couple_id,
      inviteCode: result.invite_code,
      memberCount: 2,
      createdAt: new Date().toISOString(),
    },
  }
}