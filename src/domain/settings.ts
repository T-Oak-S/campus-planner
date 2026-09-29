import type { PlannerSettings } from './types'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

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
