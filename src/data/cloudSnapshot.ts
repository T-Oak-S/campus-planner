import { exportBackup, importBackup } from '../domain/backup'
import type { PlannerData } from '../domain/types'

const PREFIX = 'campus-planner:cloud:'

export function saveCloudSnapshot(storage: Storage, userId: string, data: PlannerData): void {
  storage.setItem(`${PREFIX}${userId}`, exportBackup(data))
}

export function loadCloudSnapshot(storage: Storage, userId: string): PlannerData | null {
  const saved = storage.getItem(`${PREFIX}${userId}`)
  if (!saved) return null
  try { return importBackup(saved) } catch { return null }
}
