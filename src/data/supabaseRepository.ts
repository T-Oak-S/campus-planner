import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createDefaultPlannerData, importBackup } from '../domain/backup'
import type { PlannerData } from '../domain/types'
import { createLocalRepository } from './localRepository'
import type { PlannerRepository, PlannerUser, SaveResult } from './repository'
import { loadCloudSnapshot, saveCloudSnapshot } from './cloudSnapshot'

interface SaveRpcRow {
  status: 'saved' | 'conflict'
  data: PlannerData
  updated_at: string
}

function mapUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): PlannerUser | null {
  if (!user) return null
  const avatar = user.user_metadata?.avatar_url
  return { id: user.id, email: user.email ?? 'GitHub 用户', avatarUrl: typeof avatar === 'string' ? avatar : undefined }
}

async function currentUser(client: SupabaseClient): Promise<PlannerUser | null> {
  try {
    const { data } = await client.auth.getUser()
    if (data.user) return mapUser(data.user)
  } catch { /* Fall back to the locally cached session while offline. */ }
  const { data } = await client.auth.getSession()
  return mapUser(data.session?.user ?? null)
}

export function createSupabaseRepository(client: SupabaseClient, storage: Storage = window.localStorage): PlannerRepository {
  return {
    mode: 'cloud',
    isConfigured: true,
    async getUser() {
      return currentUser(client)
    },
    async signIn() {
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
      const { error } = await client.auth.signInWithOAuth({ provider: 'github', options: { redirectTo } })
      if (error) throw error
    },
    async signOut() {
      const { error } = await client.auth.signOut()
      if (error) throw error
    },
    async load() {
      const user = await this.getUser()
      if (!user) return createDefaultPlannerData()
      try {
        const { data, error } = await client
          .from('planner_profiles')
          .select('data')
          .eq('user_id', user.id)
          .maybeSingle()
        if (error) throw error
        const loaded = data?.data ? importBackup(JSON.stringify(data.data)) : createDefaultPlannerData()
        saveCloudSnapshot(storage, user.id, loaded)
        return loaded
      } catch (error) {
        const snapshot = loadCloudSnapshot(storage, user.id)
        if (snapshot) return snapshot
        throw error
      }
    },
    async save(data: PlannerData, expectedRemoteUpdatedAt?: string): Promise<SaveResult> {
      try {
        const user = await this.getUser()
        if (!user) return { status: 'error', message: '请先使用 GitHub 登录', retryable: true }
        const { data: response, error } = await client.rpc('save_planner_data', {
          expected_updated_at: expectedRemoteUpdatedAt ?? null,
          new_data: data,
        })
        if (error) throw error
        const row = (response as SaveRpcRow[] | null)?.[0]
        if (!row) throw new Error('empty sync response')
        if (row.status === 'conflict') {
          const remote = importBackup(JSON.stringify(row.data))
          saveCloudSnapshot(storage, user.id, remote)
          return { status: 'conflict', local: data, remote, remoteUpdatedAt: row.updated_at }
        }
        const saved = importBackup(JSON.stringify(row.data))
        saveCloudSnapshot(storage, user.id, saved)
        return { status: 'saved', data: saved, remoteUpdatedAt: row.updated_at }
      } catch {
        return { status: 'error', message: '云端保存失败，输入内容已保留，请重试', retryable: true }
      }
    },
    subscribe(listener) {
      let activeUserId: string | undefined
      const channel = client.channel('planner-sync')
      void currentUser(client).then((user) => {
        activeUserId = user?.id
        if (!activeUserId) return
        channel
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'planner_profiles', filter: `user_id=eq.${activeUserId}`,
          }, (payload) => {
            const row = payload.new as { data?: PlannerData; updated_at?: string }
            if (row.data) {
              try {
                const remote = importBackup(JSON.stringify(row.data))
                saveCloudSnapshot(storage, activeUserId as string, remote)
                listener(remote, row.updated_at)
              } catch { /* Ignore malformed remote rows instead of poisoning local state. */ }
            }
          })
          .subscribe()
      })
      return () => { void client.removeChannel(channel) }
    },
  }
}

export function createPlannerRepository(): PlannerRepository {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return createLocalRepository(window.localStorage)
  return createSupabaseRepository(createClient(url, key))
}
