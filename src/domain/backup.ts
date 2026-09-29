import type { Activity, PlannerData, PlannerSettings, PlannerTask } from './types'

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

function validActivity(value: unknown): value is Activity {
  if (!isRecord(value)) return false
  return ['id', 'title', 'date', 'start', 'end', 'location', 'notes', 'updatedAt'].every((key) => isString(value[key]))
    && (value.recurrence === 'none' || value.recurrence === 'weekly')
}

function validTask(value: unknown): value is PlannerTask {
  if (!isRecord(value)) return false
  return ['id', 'title', 'dueAt', 'notes', 'updatedAt'].every((key) => isString(value[key]))
    && ['high', 'medium', 'low'].includes(String(value.priority))
    && typeof value.completed === 'boolean'
}

function validSettings(value: unknown): value is PlannerSettings {
  if (!isRecord(value)) return false
  return isString(value.dayStart)
    && isString(value.dayEnd)
    && typeof value.reminderMinutes === 'number'
    && Array.isArray(value.periods)
    && value.periods.every((period) => isRecord(period)
      && typeof period.period === 'number'
      && isString(period.start)
      && isString(period.end))
}

function validCourseOverride(value: unknown): boolean {
  if (!isRecord(value)) return false
  return isString(value.id)
    && isString(value.occurrenceId)
    && (value.action === 'cancel' || value.action === 'update')
}

function validPlannerData(value: unknown): value is PlannerData {
  if (!isRecord(value) || value.version !== 1 || !isString(value.updatedAt)) return false
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
