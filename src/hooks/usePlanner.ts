import { useCallback, useEffect, useRef, useState } from 'react'
import { createDefaultPlannerData } from '../domain/backup'
import type { PlannerData } from '../domain/types'
import type { PlannerRepository, PlannerUser, SaveResult } from '../data/repository'

export function usePlanner(repository: PlannerRepository) {
  const [data, setData] = useState<PlannerData | null>(null)
  const [user, setUser] = useState<PlannerUser | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [conflict, setConflict] = useState<Extract<SaveResult, { status: 'conflict' }> | null>(null)
  const lastRemoteUpdatedAt = useRef<string | undefined>(undefined)
  const pendingData = useRef<PlannerData | null>(null)

  useEffect(() => {
    let mounted = true
    void Promise.all([repository.load(), repository.getUser()]).then(([loaded, currentUser]) => {
      if (!mounted) return
      setData(loaded)
      setUser(currentUser)
      lastRemoteUpdatedAt.current = loaded.updatedAt
    }).catch(() => {
      if (!mounted) return
      setData(createDefaultPlannerData())
      setSaveStatus('error')
      setSaveMessage('数据加载失败，已进入本机模式')
    })
    const unsubscribe = repository.subscribe((remote, remoteUpdatedAt) => {
      setData((current) => !current || remote.updatedAt > current.updatedAt ? remote : current)
      lastRemoteUpdatedAt.current = remoteUpdatedAt ?? remote.updatedAt
    })
    return () => { mounted = false; unsubscribe() }
  }, [repository])

  const persist = useCallback(async (next: PlannerData, expected = lastRemoteUpdatedAt.current) => {
    pendingData.current = next
    setSaveStatus('saving')
    setSaveMessage('')
    const result = await repository.save(next, expected)
    if (result.status === 'saved') {
      pendingData.current = null
      lastRemoteUpdatedAt.current = result.remoteUpdatedAt ?? result.data.updatedAt
      setSaveStatus('saved')
      window.setTimeout(() => setSaveStatus('idle'), 1600)
    } else if (result.status === 'conflict') {
      setConflict(result)
      setSaveStatus('error')
      setSaveMessage('检测到另一台设备上的修改')
    } else {
      setSaveStatus('error')
      setSaveMessage(result.message)
    }
    return result
  }, [repository])

  const updateData = useCallback((updater: (current: PlannerData) => PlannerData) => {
    if (!data) return Promise.resolve<SaveResult>({ status: 'error', message: '数据尚未加载', retryable: true })
    const next = { ...updater(data), version: 1 as const, updatedAt: new Date().toISOString() }
    setData(next)
    return persist(next)
  }, [data, persist])

  const retrySave = useCallback(() => {
    if (pendingData.current) void persist(pendingData.current)
  }, [persist])

  const useRemoteVersion = useCallback(() => {
    if (!conflict) return
    setData(conflict.remote)
    lastRemoteUpdatedAt.current = conflict.remoteUpdatedAt
    pendingData.current = null
    setConflict(null)
    setSaveStatus('idle')
  }, [conflict])

  const keepLocalVersion = useCallback(() => {
    if (!conflict) return
    const local = { ...conflict.local, updatedAt: new Date().toISOString() }
    setData(local)
    setConflict(null)
    void persist(local, conflict.remoteUpdatedAt)
  }, [conflict, persist])

  return {
    data,
    user,
    saveStatus,
    saveMessage,
    conflict,
    updateData,
    retrySave,
    useRemoteVersion,
    keepLocalVersion,
    refreshUser: async () => setUser(await repository.getUser()),
  }
}
