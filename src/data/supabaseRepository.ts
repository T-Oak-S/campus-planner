import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createDefaultPlannerData } from '../domain/backup'
import type { PlannerData } from '../domain/types'
import { createLocalRepository } from './localRepository'
import type { PlannerRepository, PlannerUser, SaveResult } from './repository'

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

export function createSupabaseRepository(client: SupabaseClient): PlannerRepository {
  return {
    mode: 'cloud',
    isConfigured: true,
    async getUser() {
      const { data } = await client.auth.getUser()
      return mapUser(data.user)
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
      const { data, error } = await client
        .from('planner_profiles')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      return data?.data ? data.data as PlannerData : createDefaultPlannerData()
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
          return { status: 'conflict', local: data, remote: row.data, remoteUpdatedAt: row.updated_at }
        }
        return { status: 'saved', data: row.data, remoteUpdatedAt: row.updated_at }
      } catch {
        return { status: 'error', message: '云端保存失败，输入内容已保留，请重试', retryable: true }
      }
    },
    subscribe(listener) {
      let activeUserId: string | undefined
      const channel = client.channel('planner-sync')
      void client.auth.getUser().then(({ data }) => {
        activeUserId = data.user?.id
        if (!activeUserId) return
        channel
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'planner_profiles', filter: `user_id=eq.${activeUserId}`,
          }, (payload) => {
            const row = payload.new as { data?: PlannerData; updated_at?: string }
            if (row.data) listener(row.data, row.updated_at)
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
