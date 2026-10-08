import { describe, expect, it } from 'vitest'
import { createDefaultPlannerData, exportBackup, importBackup } from './backup'
import { createDefaultPeriodTimes } from './settings'

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

  it('把旧版空作息数据迁移为学校默认作息', () => {
    const legacy = createDefaultPlannerData() as unknown as Record<string, unknown>
    legacy.version = 1
    legacy.settings = { dayStart: '08:00', dayEnd: '22:00', reminderMinutes: 15, periods: [] }
    const migrated = importBackup(JSON.stringify(legacy))
    expect(migrated.version).toBe(2)
    expect(migrated.settings.periods).toEqual(createDefaultPeriodTimes())
  })

  it.each([
    '{}',
    '{"version":3,"activities":[],"tasks":[],"courseOverrides":[],"settings":{},"updatedAt":"x"}',
    '{"version":1,"activities":[{"id":"bad"}],"tasks":[],"courseOverrides":[],"settings":{},"updatedAt":"x"}',
  ])('拒绝缺字段、未知版本或畸形记录', (payload) => {
    expect(() => importBackup(payload)).toThrow('备份文件无效')
  })

  it('拒绝畸形的课程调整记录', () => {
    const data = createDefaultPlannerData() as unknown as Record<string, unknown>
    data.courseOverrides = [{ id: 'bad', action: 'cancel' }]
    expect(() => importBackup(JSON.stringify(data))).toThrow('备份文件无效')
  })

  it.each([
    { date: 'not-a-date', start: '19:00', end: '20:00', recurrence: 'none' },
    { date: '2026-09-29', start: '23:00', end: '01:00', recurrence: 'none' },
    { date: '2026-09-29', start: '20:00', end: '20:00', recurrence: 'none' },
    { date: '2026-09-29', start: '19:00', end: '20:00', recurrence: 'weekly', recurrenceEnd: '2026-09-20' },
  ])('拒绝语义无效的活动 %#', (invalid) => {
    const data = createDefaultPlannerData()
    data.activities = [{
      id: 'a', title: '测试', location: '', notes: '', updatedAt: '2026-09-20T10:00:00.000Z',
      ...invalid,
    } as typeof data.activities[number]]
    expect(() => importBackup(JSON.stringify(data))).toThrow('备份文件无效')
  })

  it('拒绝畸形活动调整、设置和课程调整', () => {
    const base = createDefaultPlannerData()
    const cases = [
      { ...base, activities: [{ id: 'a', title: '测试', date: '2026-09-29', start: '19:00', end: '20:00', location: '', notes: '', recurrence: 'weekly', recurrenceEnd: '2026-10-20', overrides: 'invalid', updatedAt: base.updatedAt }] },
      { ...base, settings: { ...base.settings, dayStart: '22:00', dayEnd: '08:00' } },
      { ...base, settings: { ...base.settings, periods: [{ period: 1, start: '09:00', end: '08:00' }] } },
      { ...base, courseOverrides: [{ id: 'x', occurrenceId: 'course@2026-09-29', action: 'update', startPeriod: 8, endPeriod: 6 }] },
    ]
    for (const data of cases) expect(() => importBackup(JSON.stringify(data))).toThrow('备份文件无效')
  })
})
