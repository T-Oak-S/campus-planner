import type { Activity, PlannerData, PlannerSettings, PlannerTask } from './types'
import { isValidDate, validateActivity } from './activities'
import { validateCoursePeriodRange, validatePlannerSettings } from './settings'

const DEFAULT_SETTINGS: PlannerSettings = {
  dayStart: '08:00',
  dayEnd: '22:00',
  reminderMinutes: 15,
  periods: [],
}

export function createDefaultPlannerData(): PlannerData {
  return {
    version: 1,
    activities: [],
    tasks: [],
    courseOverrides: [],
    settings: { ...DEFAULT_SETTINGS, periods: [] },
    updatedAt: new Date().toISOString(),
  }
}

export function exportBackup(data: PlannerData): string {
  return JSON.stringify(data, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value) && !Number.isNaN(Date.parse(value))
}

function validActivity(value: unknown): value is Activity {
  if (!isRecord(value)) return false
  if (!['id', 'title', 'date', 'start', 'end', 'location', 'notes', 'updatedAt'].every((key) => isString(value[key]))) return false
  if (value.recurrence !== 'none' && value.recurrence !== 'weekly') return false
  if (value.recurrenceEnd !== undefined && !isString(value.recurrenceEnd)) return false
  if (!isDateTime(String(value.updatedAt))) return false
  if (value.overrides !== undefined && (!Array.isArray(value.overrides) || new Set(value.overrides.map((item) => isRecord(item) ? item.date : undefined)).size !== value.overrides.length || !value.overrides.every((override) => {
    if (!isRecord(override) || !isString(override.date) || !isValidDate(override.date) || (override.action !== 'cancel' && override.action !== 'update')) return false
    if (!['title', 'start', 'end', 'location', 'notes'].every((key) => override[key] === undefined || isString(override[key]))) return false
    if (override.action === 'cancel') return ['title', 'start', 'end', 'location', 'notes'].every((key) => override[key] === undefined)
    try {
      const base = value as unknown as Activity
      validateActivity({
        ...base,
        title: isString(override.title) ? override.title : base.title,
        start: isString(override.start) ? override.start : base.start,
        end: isString(override.end) ? override.end : base.end,
        location: isString(override.location) ? override.location : base.location,
        notes: isString(override.notes) ? override.notes : base.notes,
        recurrence: 'none',
        date: override.date,
        overrides: undefined,
      })
      return true
    } catch { return false }
  }))) return false
  try { validateActivity(value as unknown as Activity); return true } catch { return false }
}

function validTask(value: unknown): value is PlannerTask {
  if (!isRecord(value)) return false
  return ['id', 'title', 'dueAt', 'notes', 'updatedAt'].every((key) => isString(value[key]))
    && ['high', 'medium', 'low'].includes(String(value.priority))
    && typeof value.completed === 'boolean'
    && isDateTime(String(value.dueAt))
    && isDateTime(String(value.updatedAt))
    && (value.courseId === undefined || isString(value.courseId))
}

function validSettings(value: unknown): value is PlannerSettings {
  if (!isRecord(value)) return false
  const structurallyValid = isString(value.dayStart)
    && isString(value.dayEnd)
    && typeof value.reminderMinutes === 'number'
    && Array.isArray(value.periods)
    && value.periods.every((period) => isRecord(period)
      && typeof period.period === 'number'
      && isString(period.start)
      && isString(period.end))
  if (!structurallyValid) return false
  try { validatePlannerSettings(value as unknown as PlannerSettings); return true } catch { return false }
}

function validCourseOverride(value: unknown): boolean {
  if (!isRecord(value)) return false
  const basic = isString(value.id)
    && isString(value.occurrenceId)
    && (value.action === 'cancel' || value.action === 'update')
    && ['teacher', 'location', 'note'].every((key) => value[key] === undefined || isString(value[key]))
  if (!basic || !/@\d{4}-\d{2}-\d{2}$/.test(String(value.occurrenceId))) return false
  if (value.action === 'update') {
    if (typeof value.startPeriod !== 'number' || typeof value.endPeriod !== 'number') return false
    try { validateCoursePeriodRange(value.startPeriod, value.endPeriod) } catch { return false }
  } else if (value.startPeriod !== undefined || value.endPeriod !== undefined) return false
  return true
}

function validPlannerData(value: unknown): value is PlannerData {
  if (!isRecord(value) || value.version !== 1 || !isString(value.updatedAt) || !isDateTime(value.updatedAt)) return false
  if (!Array.isArray(value.activities) || !value.activities.every(validActivity)) return false
  if (!Array.isArray(value.tasks) || !value.tasks.every(validTask)) return false
  if (!Array.isArray(value.courseOverrides) || !value.courseOverrides.every(validCourseOverride)) return false
  return validSettings(value.settings)
}

export function importBackup(payload: string): PlannerData {
  try {
    const parsed: unknown = JSON.parse(payload)
    if (!validPlannerData(parsed)) throw new Error('invalid')
    return parsed
  } catch {
    throw new Error('备份文件无效，请选择由本工具导出的 JSON 文件')
  }
}
