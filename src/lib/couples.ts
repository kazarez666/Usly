import { supabase } from './supabase'

export type CoupleSummary = {
  id: string
  inviteCode: string
  memberCount: number
  createdAt: string
}

type CreateCoupleRpcResult = {
  couple_id: string
  invite_code: string
}

type JoinCoupleRpcResult = {
  id: string
  invite_code: string
  created_at: string
}

type MyCoupleResult = {
  ok: boolean
  couple: CoupleSummary | null
  error?: string
}

const MY_COUPLE_CACHE_MS = 4000
let recentMyCouple: { at: number; result: MyCoupleResult } | null = null

function rememberMyCouple(result: MyCoupleResult) {
  if (result.ok) recentMyCouple = { at: Date.now(), result }
  return result
}

export function clearMyCoupleReadCache() {
  recentMyCouple = null
}

function normalizeCreateResult(
  data: CreateCoupleRpcResult | CreateCoupleRpcResult[] | null,
): CreateCoupleRpcResult | null {
  if (!data) return null
  return Array.isArray(data) ? data[0] ?? null : data
}

function normalizeJoinResult(
  data: JoinCoupleRpcResult | JoinCoupleRpcResult[] | null,
): JoinCoupleRpcResult | null {
  if (!data) return null
  return Array.isArray(data) ? data[0] ?? null : data
}

async function getSummary(
  coupleId: string,
  inviteCode?: string,
): Promise<CoupleSummary | null> {
  if (!supabase) return null

  // The couple row and member count do not depend on one another. Fetching them
  // together removes one full network round-trip from app/session restoration.
  const [coupleResult, membersResult] = await Promise.all([
    supabase
      .from('couples')
      .select('id, invite_code, created_at')
      .eq('id', coupleId)
      .single(),
    supabase
      .from('couple_members')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId),
  ])

  const couple = coupleResult.data
  if (coupleResult.error || !couple) return null

  return {
    id: couple.id,
    inviteCode: inviteCode ?? couple.invite_code,
    memberCount: membersResult.count ?? 0,
    createdAt: couple.created_at,
  }
}

export async function getMyCouple(): Promise<MyCoupleResult> {
  if (!supabase) {
    return {
      ok: false,
      couple: null,
      error: 'SUPABASE_MISSING',
    }
  }

  if (recentMyCouple && Date.now() - recentMyCouple.at < MY_COUPLE_CACHE_MS) {
    return recentMyCouple.result
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
    return rememberMyCouple({
      ok: true,
      couple: null,
    })
  }

  const couple = await getSummary(membership.couple_id)

  return rememberMyCouple({
    ok: true,
    couple,
  })
}

export async function createCouple(): Promise<MyCoupleResult> {
  if (!supabase) {
    return {
      ok: false,
      couple: null,
      error: 'SUPABASE_MISSING',
    }
  }

  clearMyCoupleReadCache()
  const { data, error } = await supabase.rpc('create_couple')

  if (error) {
    return {
      ok: false,
      couple: null,
      error: error.message,
    }
  }

  const result = normalizeCreateResult(
    data as CreateCoupleRpcResult | CreateCoupleRpcResult[] | null,
  )

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
    return rememberMyCouple({
      ok: true,
      couple,
    })
  }

  // create_couple already succeeded in the database. Do not surface a false
  // failure if the immediate read is briefly delayed.
  return rememberMyCouple({
    ok: true,
    couple: {
      id: result.couple_id,
      inviteCode: result.invite_code,
      memberCount: 1,
      createdAt: new Date().toISOString(),
    },
  })
}

export async function joinCouple(inviteCode: string): Promise<MyCoupleResult> {
  if (!supabase) {
    return {
      ok: false,
      couple: null,
      error: 'SUPABASE_MISSING',
    }
  }

  const normalizedCode = inviteCode.trim().toUpperCase()

  if (!normalizedCode) {
    return {
      ok: false,
      couple: null,
      error: 'INVALID_INVITE_CODE',
    }
  }

  clearMyCoupleReadCache()
  const { data, error } = await supabase.rpc('join_couple', {
    p_invite_code: normalizedCode,
  })

  if (error) {
    const message = error.message.toUpperCase()

    if (
      message.includes('COUPLE_IS_FULL') ||
      message.includes('COUPLE_FULL')
    ) {
      return {
        ok: false,
        couple: null,
        error: 'COUPLE_FULL',
      }
    }

    if (message.includes('INVALID_INVITE_CODE')) {
      return {
        ok: false,
        couple: null,
        error: 'INVALID_INVITE_CODE',
      }
    }

    if (message.includes('CURRENT_COUPLE_NOT_SOLO')) {
      return {
        ok: false,
        couple: null,
        error: 'CURRENT_COUPLE_NOT_SOLO',
      }
    }

    if (message.includes('NOT_AUTHENTICATED')) {
      return {
        ok: false,
        couple: null,
        error: 'NOT_AUTHENTICATED',
      }
    }

    return {
      ok: false,
      couple: null,
      error: error.message,
    }
  }

  const result = normalizeJoinResult(
    data as JoinCoupleRpcResult | JoinCoupleRpcResult[] | null,
  )

  if (!result) {
    return {
      ok: false,
      couple: null,
      error: 'JOIN_FAILED',
    }
  }

  const couple = await getSummary(
    result.id,
    result.invite_code,
  )

  if (couple) {
    return rememberMyCouple({
      ok: true,
      couple,
    })
  }

  return rememberMyCouple({
    ok: true,
    couple: {
      id: result.id,
      inviteCode: result.invite_code,
      memberCount: 2,
      createdAt: result.created_at ?? new Date().toISOString(),
    },
  })
}
