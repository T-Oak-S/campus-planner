import type { PeriodTime, PlannerSettings } from './types'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const DEFAULT_PERIOD_TIMES: ReadonlyArray<Readonly<PeriodTime>> = [
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
]

export function createDefaultPeriodTimes(): PeriodTime[] {
  return DEFAULT_PERIOD_TIMES.map((period) => ({ ...period }))
}

export function validTime(value: string): boolean {
  return TIME.test(value)
}

export function validateCoursePeriodRange(startPeriod: number, endPeriod: number): void {
  if (!Number.isInteger(startPeriod) || !Number.isInteger(endPeriod) || startPeriod < 1 || endPeriod > 13) {
    throw new Error('节次必须在 1—13 之间')
  }
  if (endPeriod < startPeriod) throw new Error('结束节次不能早于开始节次')
}

export function validatePlannerSettings(settings: PlannerSettings): PlannerSettings {
  if (!validTime(settings.dayStart) || !validTime(settings.dayEnd) || settings.dayEnd <= settings.dayStart) {
    throw new Error('每日结束时间必须晚于开始时间')
  }
  if (!Number.isFinite(settings.reminderMinutes) || settings.reminderMinutes < 0) throw new Error('提醒时间无效')
  const periods = [...settings.periods].sort((a, b) => a.period - b.period)
  const seen = new Set<number>()
  let previousEnd = ''
  for (const period of periods) {
    if (!Number.isInteger(period.period) || period.period < 1 || period.period > 13 || seen.has(period.period)) throw new Error('节次编号无效或重复')
    if (!validTime(period.start) || !validTime(period.end) || period.end <= period.start) throw new Error(`第 ${period.period} 节结束时间必须晚于开始时间`)
    if (previousEnd && period.start < previousEnd) throw new Error(`第 ${period.period} 节与上一节时间重叠`)
    seen.add(period.period)
    previousEnd = period.end
  }
  return settings
}
