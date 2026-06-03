import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface DbUser {
  id: string
  username: string
  created_at: string
}

export interface DbEntry {
  id: string
  user_id: string
  material_id: string
  need: number
  have: number
}

export async function getOrCreateUser(username: string): Promise<DbUser> {
  const normalized = username.trim().toLowerCase()

  // Clean up empty accounts older than 24h (ghost accounts from typos etc)
  try { await supabase.rpc('delete_empty_users') } catch { /* best effort */ }

  // Try to find existing user
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('username', normalized)
    .single()

  if (existing) return existing

  // Create new user
  const { data: created, error } = await supabase
    .from('users')
    .insert({ username: normalized })
    .select()
    .single()

  if (error) throw error
  return created
}

export async function loadEntries(userId: string): Promise<DbEntry[]> {
  const { data, error } = await supabase
    .from('tracker_entries')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// Pinned materials
// ---------------------------------------------------------------------------

export interface PinnedMaterial {
  material_id: string
  user_id: string
  username: string
}

export async function getAllPins(): Promise<PinnedMaterial[]> {
  const { data, error } = await supabase
    .from('pinned_materials')
    .select('material_id, user_id, users(username)')
    .order('created_at', { ascending: true })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    material_id: row.material_id as string,
    user_id: row.user_id as string,
    username: (Array.isArray(row.users) ? row.users[0]?.username : row.users?.username) ?? 'unknown',
  }))
}

export async function getUserPins(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('pinned_materials')
    .select('material_id')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map(r => r.material_id)
}

export async function pinMaterial(userId: string, materialId: string): Promise<void> {
  const { error } = await supabase
    .from('pinned_materials')
    .insert({ user_id: userId, material_id: materialId })
  if (error) throw error
}

export async function unpinMaterial(userId: string, materialId: string): Promise<void> {
  const { error } = await supabase
    .from('pinned_materials')
    .delete()
    .eq('user_id', userId)
    .eq('material_id', materialId)
  if (error) throw error
}

export async function upsertEntry(
  userId: string,
  materialId: string,
  need: number,
  have: number
) {
  const { error } = await supabase
    .from('tracker_entries')
    .upsert(
      { user_id: userId, material_id: materialId, need, have, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,material_id' }
    )
  if (error) throw error
}
