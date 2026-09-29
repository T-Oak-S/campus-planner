import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createDefaultPlannerData } from '../domain/backup'
import type { PlannerRepository, SaveResult } from '../data/repository'
import type { PlannerData } from '../domain/types'
import { usePlanner } from './usePlanner'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

function repository(save: PlannerRepository['save'], mode: 'local' | 'cloud' = 'cloud') {
  let listener: ((data: PlannerData, remoteUpdatedAt?: string) => void) | undefined
  const repo: PlannerRepository = {
    mode, isConfigured: mode === 'cloud', getUser: async () => mode === 'cloud' ? { id: 'u', email: 'u@example.com' } : null,
    signIn: async () => undefined, signOut: async () => undefined, load: async () => createDefaultPlannerData(), save,
    subscribe(callback) { listener = callback; return () => { listener = undefined } },
  }
  return { repo, emit: (data: PlannerData, updatedAt?: string) => listener?.(data, updatedAt) }
}

describe('计划数据同步', () => {
  it('串行保存并保留最新失败版本以便重试', async () => {
    const first = deferred<SaveResult>()
    const second = deferred<SaveResult>()
    const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockResolvedValue({ status: 'saved', data: createDefaultPlannerData() })
    const { repo } = repository(save, 'local')
    const { result } = renderHook(() => usePlanner(repo))
    await waitFor(() => expect(result.current.data).not.toBeNull())
    let firstSave!: Promise<SaveResult>
    let secondSave!: Promise<SaveResult>
    act(() => {
      firstSave = result.current.updateData((data) => ({ ...data, tasks: [...data.tasks, { id: 'a', title: 'A', dueAt: '2026-10-01T10:00', priority: 'low', completed: false, notes: '', updatedAt: data.updatedAt }] }))
      secondSave = result.current.updateData((data) => ({ ...data, tasks: [...data.tasks, { id: 'b', title: 'B', dueAt: '2026-10-01T11:00', priority: 'low', completed: false, notes: '', updatedAt: data.updatedAt }] }))
    })
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    first.resolve({ status: 'saved', data: createDefaultPlannerData(), remoteUpdatedAt: '2026-09-29T00:00:00Z' })
    await firstSave
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
    second.resolve({ status: 'error', message: '失败', retryable: true })
    await secondSave
    expect(result.current.data?.tasks.map((task) => task.id)).toEqual(['a', 'b'])
    await waitFor(() => expect(result.current.saveStatus).toBe('error'))
    act(() => result.current.retrySave())
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3))
  })

  it('本机有待保存修改时把远端通知作为冲突处理', async () => {
    const pending = deferred<SaveResult>()
    const { repo, emit } = repository(() => pending.promise)
    const { result } = renderHook(() => usePlanner(repo))
    await waitFor(() => expect(result.current.data).not.toBeNull())
    act(() => { void result.current.updateData((data) => ({ ...data, tasks: [{ id: 'local', title: '本机', dueAt: '2026-10-01T10:00', priority: 'low', completed: false, notes: '', updatedAt: data.updatedAt }] })) })
    const remote = { ...createDefaultPlannerData(), updatedAt: '2099-01-01T00:00:00Z', tasks: [{ id: 'remote', title: '远端', dueAt: '2026-10-01T10:00', priority: 'low' as const, completed: false, notes: '', updatedAt: '2099-01-01T00:00:00Z' }] }
    act(() => emit(remote, remote.updatedAt))
    expect(result.current.data?.tasks[0].id).toBe('local')
    expect(result.current.conflict?.remote.tasks[0].id).toBe('remote')
  })

  it('云端离线时拒绝修改并保持只读数据', async () => {
    const original = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine')
    Object.defineProperty(Navigator.prototype, 'onLine', { configurable: true, get: () => false })
    const { repo } = repository(vi.fn())
    const { result } = renderHook(() => usePlanner(repo))
    await waitFor(() => expect(result.current.data).not.toBeNull())
    let response!: SaveResult
    await act(async () => { response = await result.current.updateData((data) => ({ ...data, tasks: [{ id: 'x' } as never] })) })
    expect(response.status).toBe('error')
    expect(result.current.data?.tasks).toHaveLength(0)
    if (original) Object.defineProperty(Navigator.prototype, 'onLine', original)
  })

  it('退出登录后立即清除上一账户的私有数据', async () => {
    const secret = createDefaultPlannerData()
    secret.tasks = [{ id: 'secret', title: '私人任务', dueAt: '2026-10-01T10:00', priority: 'high', completed: false, notes: '', updatedAt: secret.updatedAt }]
    let signedIn = true
    const repo: PlannerRepository = {
      mode: 'cloud', isConfigured: true,
      getUser: async () => signedIn ? { id: 'u', email: 'u@example.com' } : null,
      signIn: async () => undefined, signOut: async () => { signedIn = false },
      load: async () => signedIn ? secret : createDefaultPlannerData(),
      save: async (data) => ({ status: 'saved', data }), subscribe: () => () => undefined,
    }
    const { result } = renderHook(() => usePlanner(repo))
    await waitFor(() => expect(result.current.data?.tasks[0]?.id).toBe('secret'))
    await act(() => result.current.signOut())
    expect(result.current.user).toBeNull()
    expect(result.current.data?.tasks).toHaveLength(0)
  })
})
