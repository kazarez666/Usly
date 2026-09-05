import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type RequestBody = {
  coupleId?: string
  type?: 'message' | 'note' | 'feeling' | 'desire'
  title?: string
  body?: string
  entityId?: string | null
  url?: string
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:usly@example.com'

    if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: 'PUSH_SERVER_NOT_CONFIGURED' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    const userId = userData.user?.id
    if (userError || !userId) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = await req.json() as RequestBody
    const coupleId = String(payload.coupleId || '')
    const type = payload.type
    const title = String(payload.title || 'Usly').slice(0, 120)
    const body = String(payload.body || '').slice(0, 300)
    const url = String(payload.url || '/Usly/').slice(0, 500)

    if (!coupleId || !type || !['message', 'note', 'feeling', 'desire'].includes(type)) {
      return new Response(JSON.stringify({ error: 'INVALID_PAYLOAD' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: members, error: membersError } = await admin
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', coupleId)

    if (membersError) throw membersError
    const memberIds = (members ?? []).map(row => row.user_id as string)
    if (!memberIds.includes(userId)) {
      return new Response(JSON.stringify({ error: 'NOT_COUPLE_MEMBER' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const recipientIds = memberIds.filter(id => id !== userId)
    if (!recipientIds.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', recipientIds)

    if (subscriptionsError) throw subscriptionsError

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
    const message = JSON.stringify({
      type,
      title,
      body,
      entityId: payload.entityId ?? null,
      url,
      tag: payload.entityId ? `${type}:${payload.entityId}` : undefined,
    })

    let sent = 0
    const staleIds: string[] = []

    await Promise.all((subscriptions ?? []).map(async subscription => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, message)
        sent += 1
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          staleIds.push(subscription.id)
          return
        }
        console.error('Push delivery failed:', error)
      }
    }))

    if (staleIds.length) {
      await admin.from('push_subscriptions').delete().in('id', staleIds)
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('send-push failed:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'SEND_PUSH_FAILED' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
