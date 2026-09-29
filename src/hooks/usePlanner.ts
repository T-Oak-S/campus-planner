import { useCallback, useEffect, useRef, useState } from 'react'
import { createDefaultPlannerData } from '../domain/backup'
import type { PlannerData } from '../domain/types'
import type { PlannerRepository, PlannerUser, SaveResult } from '../data/repository'

function nextUpdatedAt(previous: string): string {
  const now = Date.now()
  const prior = Date.parse(previous)
  return new Date(Math.max(now, Number.isNaN(prior) ? now : prior + 1)).toISOString()
}

export function usePlanner(repository: PlannerRepository) {
  const [data, setData] = useState<PlannerData | null>(null)
  const [user, setUser] = useState<PlannerUser | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [conflict, setConflict] = useState<Extract<SaveResult, { status: 'conflict' }> | null>(null)
  const [subscriptionGeneration, setSubscriptionGeneration] = useState(0)
  const dataRef = useRef<PlannerData | null>(null)
  const lastRemoteUpdatedAt = useRef<string | undefined>(undefined)
  const pendingData = useRef<PlannerData | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const revision = useRef(0)
  const session = useRef(0)
  const inFlightUpdatedAt = useRef<string | null>(null)
  const savedTimer = useRef<number | undefined>(undefined)

  const replaceData = useCallback((next: PlannerData | null) => {
    dataRef.current = next
    setData(next)
  }, [])

  useEffect(() => {
    let mounted = true
    const currentSession = ++session.current
    void Promise.all([repository.load(), repository.getUser()]).then(([loaded, currentUser]) => {
      if (!mounted || currentSession !== session.current) return
      replaceData(loaded)
      setUser(currentUser)
      lastRemoteUpdatedAt.current = loaded.updatedAt
    }).catch(() => {
      if (!mounted || currentSession !== session.current) return
      replaceData(createDefaultPlannerData())
      setSaveStatus('error')
      setSaveMessage(repository.mode === 'cloud' ? '云端数据暂不可用；当前为只读状态' : '数据加载失败，已使用空白本机数据')
    })
    const unsubscribe = repository.subscribe((remote, remoteUpdatedAt) => {
      const timestamp = remoteUpdatedAt ?? remote.updatedAt
      if (remote.updatedAt === inFlightUpdatedAt.current) {
        lastRemoteUpdatedAt.current = timestamp
        return
      }
      const local = pendingData.current
      if (local) {
        setConflict({ status: 'conflict', local, remote, remoteUpdatedAt: timestamp })
        setSaveStatus('error')
        setSaveMessage('检测到另一台设备上的修改')
        return
      }
      const current = dataRef.current
      if (!current || remote.updatedAt > current.updatedAt) {
        replaceData(remote)
        lastRemoteUpdatedAt.current = timestamp
      }
    })
    return () => {
      mounted = false
      unsubscribe()
      if (savedTimer.current) window.clearTimeout(savedTimer.current)
    }
  }, [repository, replaceData, subscriptionGeneration])

  const runSave = useCallback(async (next: PlannerData, ownRevision: number, ownSession: number, expectedOverride?: string): Promise<SaveResult> => {
    if (ownRevision === revision.current) {
      setSaveStatus('saving')
      setSaveMessage('')
    }
    inFlightUpdatedAt.current = next.updatedAt
    const result = await repository.save(next, expectedOverride ?? lastRemoteUpdatedAt.current)
    inFlightUpdatedAt.current = null
    if (ownSession !== session.current) return result
    if (result.status === 'saved') {
      lastRemoteUpdatedAt.current = result.remoteUpdatedAt ?? result.data.updatedAt
      if (ownRevision === revision.current) {
        pendingData.current = null
        setSaveStatus('saved')
        if (savedTimer.current) window.clearTimeout(savedTimer.current)
        savedTimer.current = window.setTimeout(() => setSaveStatus('idle'), 1600)
      }
    } else if (result.status === 'conflict') {
      const local = pendingData.current ?? result.local
      setConflict({ ...result, local })
      if (ownRevision === revision.current) {
        setSaveStatus('error')
        setSaveMessage('检测到另一台设备上的修改')
      }
    } else if (ownRevision === revision.current) {
      setSaveStatus('error')
      setSaveMessage(result.message)
    }
    return result
  }, [repository])

  const enqueueSave = useCallback((next: PlannerData, expectedOverride?: string) => {
    const ownRevision = ++revision.current
    const ownSession = session.current
    pendingData.current = next
    setSaveStatus('saving')
    const operation = queue.current.then(
      () => runSave(next, ownRevision, ownSession, expectedOverride),
      () => runSave(next, ownRevision, ownSession, expectedOverride),
    )
    queue.current = operation
    return operation
  }, [runSave])

  const updateData = useCallback((updater: (current: PlannerData) => PlannerData): Promise<SaveResult> => {
    const current = dataRef.current
    if (!current) return Promise.resolve({ status: 'error', message: '数据尚未加载', retryable: true })
    if (repository.mode === 'cloud' && typeof navigator !== 'undefined' && !navigator.onLine) {
      setSaveStatus('error')
      setSaveMessage('当前离线，云端数据仅可查看')
      return Promise.resolve({ status: 'error', message: '当前离线，云端数据仅可查看', retryable: true })
    }
    const next = { ...updater(current), version: 1 as const, updatedAt: nextUpdatedAt(current.updatedAt) }
    replaceData(next)
    return enqueueSave(next)
  }, [enqueueSave, replaceData, repository.mode])

  const retrySave = useCallback(() => {
    if (pendingData.current) void enqueueSave(pendingData.current)
  }, [enqueueSave])

  const useRemoteVersion = useCallback(() => {
    if (!conflict) return
    session.current += 1
    revision.current += 1
    replaceData(conflict.remote)
    lastRemoteUpdatedAt.current = conflict.remoteUpdatedAt
    pendingData.current = null
    setConflict(null)
    setSaveStatus('idle')
  }, [conflict, replaceData])

  const keepLocalVersion = useCallback(() => {
    if (!conflict) return
    const local = { ...conflict.local, updatedAt: nextUpdatedAt(conflict.local.updatedAt) }
    replaceData(local)
    setConflict(null)
    void enqueueSave(local, conflict.remoteUpdatedAt)
  }, [conflict, enqueueSave, replaceData])

  const refreshUser = useCallback(async () => setUser(await repository.getUser()), [repository])

  const signOut = useCallback(async () => {
    await repository.signOut()
    session.current += 1
    revision.current += 1
    pendingData.current = null
    inFlightUpdatedAt.current = null
    lastRemoteUpdatedAt.current = undefined
    setConflict(null)
    setUser(null)
    replaceData(createDefaultPlannerData())
    setSaveStatus('idle')
    setSaveMessage('')
    setSubscriptionGeneration((value) => value + 1)
  }, [repository, replaceData])

  return { data, user, saveStatus, saveMessage, conflict, updateData, retrySave, useRemoteVersion, keepLocalVersion, refreshUser, signOut }
}
