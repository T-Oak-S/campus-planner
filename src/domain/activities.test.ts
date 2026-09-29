import { describe, expect, it } from 'vitest'
import type { Activity } from './types'
import {
  calculateFreeSlots,
  detectConflicts,
  expandActivityOccurrences,
  validateActivity,
} from './activities'

const weeklyActivity: Activity = {
  id: 'club',
  title: '社团例会',
  date: '2026-09-22',
  start: '18:30',
  end: '20:00',
  location: '大学生活动中心',
  notes: '',
  recurrence: 'weekly',
  recurrenceEnd: '2026-10-13',
  updatedAt: '2026-09-20T10:00:00+08:00',
}

describe('个人安排展开', () => {
  it('单次安排只在自己的日期出现', () => {
    const activity = { ...weeklyActivity, recurrence: 'none' as const }
    expect(expandActivityOccurrences([activity], { start: '2026-09-20', end: '2026-10-20' })).toHaveLength(1)
  })

  it('每周安排展开到结束日期', () => {
    const dates = expandActivityOccurrences(
      [weeklyActivity],
      { start: '2026-09-20', end: '2026-10-20' },
    ).map((item) => item.date)
    expect(dates).toEqual(['2026-09-22', '2026-09-29', '2026-10-06', '2026-10-13'])
  })

  it('只修改一次时不会改变整个系列', () => {
    const edited: Activity = {
      ...weeklyActivity,
      overrides: [{ date: '2026-09-29', action: 'update', start: '19:00', end: '20:30', location: '线上' }],
    }
    const occurrences = expandActivityOccurrences([edited], { start: '2026-09-22', end: '2026-09-29' })
    expect(occurrences.map(({ date, start, end, location }) => ({ date, start, end, location }))).toEqual([
      { date: '2026-09-22', start: '18:30', end: '20:00', location: '大学生活动中心' },
      { date: '2026-09-29', start: '19:00', end: '20:30', location: '线上' },
    ])
  })

  it('取消一次时只移除该日期', () => {
    const edited: Activity = {
      ...weeklyActivity,
      overrides: [{ date: '2026-09-29', action: 'cancel' }],
    }
    expect(expandActivityOccurrences([edited], { start: '2026-09-22', end: '2026-10-06' }).map((item) => item.date)).toEqual([
      '2026-09-22',
      '2026-10-06',
    ])
  })
})

describe('冲突与空闲时段', () => {
  it('检测相交安排，但允许首尾相接', () => {
    const occupied = [
      { id: 'class', title: '课程', startAt: '2026-09-21T09:00', endAt: '2026-09-21T10:30' },
      { id: 'lunch', title: '午饭', startAt: '2026-09-21T12:00', endAt: '2026-09-21T13:00' },
    ]
    expect(detectConflicts({ id: 'study', title: '自习', startAt: '2026-09-21T10:30', endAt: '2026-09-21T12:30' }, occupied).map((item) => item.id)).toEqual(['lunch'])
  })

  it('合并重叠占用后给出至少30分钟的空闲时段', () => {
    const slots = calculateFreeSlots('2026-09-21', '08:00', '14:00', [
      { id: 'a', title: 'A', startAt: '2026-09-21T09:00', endAt: '2026-09-21T10:30' },
      { id: 'b', title: 'B', startAt: '2026-09-21T10:00', endAt: '2026-09-21T11:00' },
      { id: 'c', title: 'C', startAt: '2026-09-21T12:00', endAt: '2026-09-21T13:45' },
    ])
    expect(slots).toEqual([
      { start: '08:00', end: '09:00', minutes: 60 },
      { start: '11:00', end: '12:00', minutes: 60 },
    ])
  })

  it.each([
    { start: '20:00', end: '20:00' },
    { start: '23:00', end: '01:00' },
  ])('拒绝零时长或跨夜安排 $start-$end', ({ start, end }) => {
    expect(() => validateActivity({ ...weeklyActivity, recurrence: 'none', start, end })).toThrow('结束时间必须晚于开始时间')
  })
})
