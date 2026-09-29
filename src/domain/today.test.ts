import { describe, expect, it } from 'vitest'
import { buildTodaySummary } from './today'
import type { ActivityOccurrence, CourseOccurrence, PeriodTime, PlannerTask } from './types'

describe('今日摘要', () => {
  it('按实际时间选择尚未结束的下一项并按截止时间列任务', () => {
    const periods: PeriodTime[] = [{ period: 1, start: '08:00', end: '08:45' }, { period: 2, start: '08:50', end: '09:35' }]
    const course = { id: 'c', courseName: '早课', startPeriod: 1, endPeriod: 2, teacher: '', location: '', color: '#000' } as CourseOccurrence
    const activity = { occurrenceId: 'a@d', sourceActivityId: 'a', title: '下午自习', start: '14:00', end: '15:00', location: '', date: '2026-09-29' } as ActivityOccurrence
    const tasks = [
      { id: 'late', title: '晚截止', dueAt: '2026-10-02T10:00', completed: false },
      { id: 'soon', title: '先截止', dueAt: '2026-09-30T10:00', completed: false },
    ] as PlannerTask[]
    const summary = buildTodaySummary([course], [activity], tasks, periods, '2026-09-29T10:00')
    expect(summary.next?.title).toBe('下午自习')
    expect(summary.pending.map((task) => task.id)).toEqual(['soon', 'late'])
  })
})
