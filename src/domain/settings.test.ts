import { describe, expect, it } from 'vitest'
import { validateCoursePeriodRange, validatePlannerSettings } from './settings'

describe('作息与课程时间校验', () => {
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
