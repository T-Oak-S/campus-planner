import { describe, expect, it } from 'vitest'
import { activityExportRange } from './exportRange'
import type { Activity } from './types'

describe('个人安排导出范围', () => {
  it('覆盖学期之外及重复系列的全部日期', () => {
    const activities = [
      { id: 'a', title: '寒假活动', date: '2027-01-25', start: '10:00', end: '11:00', location: '', notes: '', recurrence: 'none', updatedAt: '' },
      { id: 'b', title: '暑期计划', date: '2027-07-01', start: '10:00', end: '11:00', location: '', notes: '', recurrence: 'weekly', recurrenceEnd: '2027-07-29', updatedAt: '' },
    ] as Activity[]
    expect(activityExportRange(activities)).toEqual({ start: '2027-01-25', end: '2027-07-29' })
  })
})
