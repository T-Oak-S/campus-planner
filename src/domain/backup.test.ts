import { describe, expect, it } from 'vitest'
import { createDefaultPlannerData, exportBackup, importBackup } from './backup'

describe('数据备份', () => {
  it('导出的数据可以完整恢复', () => {
    const data = createDefaultPlannerData()
    data.tasks.push({
      id: 'task-1',
      title: '提交作业',
      dueAt: '2026-09-30T20:00',
      priority: 'high',
      completed: false,
      notes: '第一章',
      updatedAt: '2026-09-20T10:00:00+08:00',
    })
    expect(importBackup(exportBackup(data))).toEqual(data)
  })

  it.each([
    '{}',
    '{"version":2,"activities":[],"tasks":[],"courseOverrides":[],"settings":{},"updatedAt":"x"}',
    '{"version":1,"activities":[{"id":"bad"}],"tasks":[],"courseOverrides":[],"settings":{},"updatedAt":"x"}',
  ])('拒绝缺字段、未知版本或畸形记录', (payload) => {
    expect(() => importBackup(payload)).toThrow('备份文件无效')
  })

  it('拒绝畸形的课程调整记录', () => {
    const data = createDefaultPlannerData() as unknown as Record<string, unknown>
    data.courseOverrides = [{ id: 'bad', action: 'cancel' }]
    expect(() => importBackup(JSON.stringify(data))).toThrow('备份文件无效')
  })
})
