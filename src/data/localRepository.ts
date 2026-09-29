import { createDefaultPlannerData, exportBackup, importBackup } from '../domain/backup'
import type { PlannerData } from '../domain/types'
import type { PlannerRepository, SaveResult } from './repository'

const STORAGE_KEY = 'campus-planner:data'

export function createLocalRepository(storage: Storage): PlannerRepository {
  return {
    mode: 'local',
    isConfigured: false,
    async getUser() { return null },
    async signIn() { return Promise.resolve() },
    async signOut() { return Promise.resolve() },
    async load() {
      const saved = storage.getItem(STORAGE_KEY)
      if (!saved) return createDefaultPlannerData()
      try {
        return importBackup(saved)
      } catch {
        return createDefaultPlannerData()
      }
    },
    async save(data: PlannerData): Promise<SaveResult> {
      try {
        storage.setItem(STORAGE_KEY, exportBackup(data))
        return { status: 'saved', data }
      } catch {
        return { status: 'error', message: '本机保存失败，请重试', retryable: true }
      }
    },
    subscribe() { return () => undefined },
  }
}
