import { createClient } from '@supabase/supabase-js'
import type { SessionData, FieldDef } from './schema'

// VPSへ移行するときはこのファイルだけ変更する

function getClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  return createClient(url, key)
}

export async function saveSession(session: SessionData, enabledFields: FieldDef[]): Promise<void> {
  const row: Record<string, unknown> = {}
  for (const f of enabledFields) {
    row[f.key] = f.getValue(session)
  }
  const { error } = await getClient().from('sessions').insert(row)
  if (error) throw error
}
