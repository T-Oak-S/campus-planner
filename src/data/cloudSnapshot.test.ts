import { describe, expect, it } from 'vitest'
import { createDefaultPlannerData } from '../domain/backup'
import { loadCloudSnapshot, saveCloudSnapshot } from './cloudSnapshot'

describe('云端离线快照', () => {
  it('按用户隔离并校验快照', () => {
    const storage = window.localStorage
    storage.clear()
    const first = createDefaultPlannerData()
    first.tasks = [{ id: 'a', title: '甲', dueAt: '2026-10-01T10:00', priority: 'low', completed: false, notes: '', updatedAt: first.updatedAt }]
    saveCloudSnapshot(storage, 'user-a', first)
    expect(loadCloudSnapshot(storage, 'user-a')?.tasks[0].title).toBe('甲')
    expect(loadCloudSnapshot(storage, 'user-b')).toBeNull()
    storage.setItem('campus-planner:cloud:user-b', '{"bad":true}')
    expect(loadCloudSnapshot(storage, 'user-b')).toBeNull()
  })
})
