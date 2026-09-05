import { supabase } from './supabase'

type PushPayload = {
  type: 'message' | 'note' | 'feeling' | 'desire'
  title: string
  body: string
  entityId?: string | null
  url?: string
}

function vapidKeyToBytes(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const bytes = Uint8Array.from(raw, char => char.charCodeAt(0))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function serviceWorkerUrl(): string {
  return `${import.meta.env.BASE_URL}sw.js`
}

export async function ensurePushSubscription(): Promise<{ ok: boolean; reason?: string }> {
  if (!supabase) return { ok: false, reason: 'SUPABASE_MISSING' }
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, reason: 'PUSH_UNSUPPORTED' }
  }

  const publicKey = String(import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '').trim()
  if (!publicKey) return { ok: false, reason: 'VAPID_PUBLIC_KEY_MISSING' }
  if (Notification.permission !== 'granted') return { ok: false, reason: `PERMISSION_${Notification.permission.toUpperCase()}` }

  const { data: authData, error: authError } = await supabase.auth.getUser()
  const userId = authData.user?.id
  if (authError || !userId) return { ok: false, reason: 'NOT_AUTHENTICATED' }

  try {
    const registration = await navigator.serviceWorker.register(serviceWorkerUrl(), { scope: import.meta.env.BASE_URL })
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKeyToBytes(publicKey),
      })
    }

    const json = subscription.toJSON()
    const p256dh = json.keys?.p256dh
    const auth = json.keys?.auth
    if (!p256dh || !auth) return { ok: false, reason: 'SUBSCRIPTION_KEYS_MISSING' }

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

    if (error) {
      console.error('Failed to save push subscription:', error)
      return { ok: false, reason: error.message }
    }

    return { ok: true }
  } catch (error) {
    console.error('Failed to register push subscription:', error)
    return { ok: false, reason: error instanceof Error ? error.message : 'PUSH_REGISTER_FAILED' }
  }
}

export async function requestPushPermissionAndSubscribe(): Promise<{ ok: boolean; reason?: string }> {
  if (!('Notification' in window)) return { ok: false, reason: 'PUSH_UNSUPPORTED' }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: `PERMISSION_${permission.toUpperCase()}` }
  return ensurePushSubscription()
}

export async function sendPartnerPush(coupleId: string, payload: PushPayload): Promise<void> {
  if (!supabase) return
  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        coupleId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        entityId: payload.entityId ?? null,
        url: payload.url ?? import.meta.env.BASE_URL,
      },
    })
    if (error) console.error('Failed to send partner push:', error)
  } catch (error) {
    console.error('Failed to invoke push function:', error)
  }
}
