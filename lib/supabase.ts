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
