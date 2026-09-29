import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultPlannerData } from '../domain/backup'
import { createLocalRepository } from './localRepository'
import { detectSyncConflict, toCloudRow } from './repository'

describe('本机数据仓库', () => {
  beforeEach(() => window.localStorage.clear())

  it('保存后可以从新的仓库实例加载相同数据', async () => {
    const data = createDefaultPlannerData()
    data.tasks.push({
      id: 'task-1', title: '英语作业', dueAt: '2026-09-22T20:00', priority: 'high', completed: false,
      notes: '', updatedAt: '2026-09-20T10:00:00+08:00',
    })
    const first = createLocalRepository(window.localStorage)
    expect((await first.save(data)).status).toBe('saved')

    const second = createLocalRepository(window.localStorage)
    expect((await second.load()).tasks[0].title).toBe('英语作业')
  })

  it('存储写入失败时保留可重试错误而不抛出', async () => {
    const brokenStorage: Storage = {
      getItem: () => null,
      setItem: () => { throw new Error('quota') },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    }
    const result = await createLocalRepository(brokenStorage).save(createDefaultPlannerData())
    expect(result).toEqual({ status: 'error', message: '本机保存失败，请重试', retryable: true })
  })

  it('损坏的本机缓存不会阻止应用启动', async () => {
    window.localStorage.setItem('campus-planner:data', '{bad json')
    const result = await createLocalRepository(window.localStorage).load()
    expect(result.version).toBe(1)
    expect(result.tasks).toEqual([])
  })
})

describe('云端同步边界', () => {
  it('上传记录始终包含当前用户ID和完整数据', () => {
    const data = createDefaultPlannerData()
    expect(toCloudRow('user-123', data)).toEqual({
      user_id: 'user-123',
      data,
      updated_at: data.updatedAt,
    })
  })

  it('本机和远端都在上次同步后变化时标记冲突', () => {
    expect(detectSyncConflict(
      '2026-09-21T10:00:00.000Z',
      '2026-09-21T11:00:00.000Z',
      '2026-09-21T09:00:00.000Z',
    )).toBe(true)
    expect(detectSyncConflict(
      '2026-09-21T08:00:00.000Z',
      '2026-09-21T11:00:00.000Z',
      '2026-09-21T09:00:00.000Z',
    )).toBe(false)
  })
})
