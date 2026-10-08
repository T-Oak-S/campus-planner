import { describe, expect, it } from 'vitest'
import { createDefaultPeriodTimes, validateCoursePeriodRange, validatePlannerSettings } from './settings'

describe('作息与课程时间校验', () => {
  it('预置学校第 1—13 节的完整作息', () => {
    expect(createDefaultPeriodTimes()).toEqual([
      { period: 1, start: '08:00', end: '08:45' },
      { period: 2, start: '08:50', end: '09:35' },
      { period: 3, start: '09:50', end: '10:35' },
      { period: 4, start: '10:40', end: '11:25' },
      { period: 5, start: '11:30', end: '12:15' },
      { period: 6, start: '14:00', end: '14:45' },
      { period: 7, start: '14:50', end: '15:35' },
      { period: 8, start: '15:50', end: '16:35' },
      { period: 9, start: '16:40', end: '17:25' },
      { period: 10, start: '17:30', end: '18:15' },
      { period: 11, start: '19:00', end: '19:45' },
      { period: 12, start: '19:50', end: '20:35' },
      { period: 13, start: '20:40', end: '21:25' },
    ])
  })

  it('拒绝反向或重叠的作息时间', () => {
    expect(() => validatePlannerSettings({ dayStart: '22:00', dayEnd: '08:00', reminderMinutes: 15, periods: [] })).toThrow()
    expect(() => validatePlannerSettings({ dayStart: '08:00', dayEnd: '22:00', reminderMinutes: 15, periods: [
      { period: 1, start: '08:00', end: '09:00' }, { period: 2, start: '08:30', end: '09:30' },
    ] })).toThrow()
  })

  it('拒绝结束节次早于开始节次', () => {
    expect(() => validateCoursePeriodRange(8, 6)).toThrow('结束节次')
  })
})
