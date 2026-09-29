import type { PlannerData } from '../domain/types'

export interface PlannerUser {
  id: string
  email: string
  avatarUrl?: string
}

export type SaveResult =
  | { status: 'saved'; data: PlannerData; remoteUpdatedAt?: string }
  | { status: 'conflict'; local: PlannerData; remote: PlannerData; remoteUpdatedAt: string }
  | { status: 'error'; message: string; retryable: true }

export interface PlannerRepository {
  mode: 'local' | 'cloud'
  isConfigured: boolean
  getUser(): Promise<PlannerUser | null>
  signIn(): Promise<void>
  signOut(): Promise<void>
  load(): Promise<PlannerData>
  save(data: PlannerData, expectedRemoteUpdatedAt?: string): Promise<SaveResult>
  subscribe(listener: (data: PlannerData, remoteUpdatedAt?: string) => void): () => void
}

export interface CloudRow {
  user_id: string
  data: PlannerData
  updated_at: string
}

export function toCloudRow(userId: string, data: PlannerData): CloudRow {
  return { user_id: userId, data, updated_at: data.updatedAt }
}

export function detectSyncConflict(
  localUpdatedAt: string,
  remoteUpdatedAt: string,
  lastSyncedAt: string,
): boolean {
  return localUpdatedAt > lastSyncedAt && remoteUpdatedAt > lastSyncedAt
}
