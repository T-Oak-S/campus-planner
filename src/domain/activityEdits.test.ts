import { describe, expect, it } from 'vitest'
import { applyActivityEdit } from './activityEdits'
import type { Activity, ActivityOccurrence } from './types'

const source: Activity = {
  id: 'series', title: '自习', date: '2026-09-22', start: '19:00', end: '20:00', location: '图书馆', notes: '',
  recurrence: 'weekly', recurrenceEnd: '2026-10-20', updatedAt: '2026-09-20T00:00:00Z',
  overrides: [{ date: '2026-09-29', action: 'update', title: '小组自习', start: '18:00' }],
}
const occurrence: ActivityOccurrence = {
  ...source, title: '小组自习', start: '18:00', date: '2026-09-29', occurrenceId: 'series@2026-09-29', sourceActivityId: 'series',
}

describe('重复安排编辑', () => {
  it('修改整个系列时保留最初开始日期', () => {
    const result = applyActivityEdit([source], occurrence, {
      title: '晚间自习', date: '2026-09-29', start: '19:30', end: '20:30', location: '', notes: '', recurrence: 'weekly', recurrenceEnd: '2026-10-20', editScope: 'series',
    }, () => 'unused', '2026-09-30T00:00:00Z')
    expect(result[0].date).toBe('2026-09-22')
  })

  it('移动已调整的单次安排时用取消替换旧调整', () => {
    const result = applyActivityEdit([source], occurrence, {
      title: '小组自习', date: '2026-10-01', start: '18:00', end: '19:00', location: '', notes: '', recurrence: 'weekly', recurrenceEnd: '2026-10-20', editScope: 'occurrence',
    }, () => 'moved', '2026-09-30T00:00:00Z')
    expect(result[0].overrides?.filter((item) => item.date === '2026-09-29')).toEqual([{ date: '2026-09-29', action: 'cancel' }])
    expect(result[1]).toMatchObject({ id: 'moved', date: '2026-10-01', recurrence: 'none' })
  })
})
