import { supabase } from './supabase'

export type AppNotification = {
  id: string
  coupleId: string
  recipientId: string
  actorId: string | null
  type: string
  title: string
  body: string | null
  entityType: string | null
  entityId: string | null
  createdAt: string
  readAt: string | null
}

function mapRow(row: any): AppNotification {
  return {
    id: row.id,
    coupleId: row.couple_id,
    recipientId: row.recipient_id,
    actorId: row.actor_id,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdAt: row.created_at,
    readAt: row.read_at,
  }
}

export async function getNotifications(coupleId: string): Promise<AppNotification[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('id, couple_id, recipient_id, actor_id, type, title, body, entity_type, entity_id, created_at, read_at')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) {
    console.error('Failed to load notifications:', error)
    return []
  }
  return (data ?? []).map(mapRow)
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!supabase) return
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
}

export async function markAllNotificationsRead(coupleId: string): Promise<void> {
  if (!supabase) return
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('couple_id', coupleId)
    .is('read_at', null)
}
