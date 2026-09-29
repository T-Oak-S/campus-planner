import type {
  AcademicDate,
  CalendarException,
  CourseOccurrence,
  CourseOverride,
  CourseRule,
  DateRange,
} from './types'

const SEMESTER_START = '2026-09-21'

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  const result = parseDate(date)
  result.setUTCDate(result.getUTCDate() + days)
  return formatDate(result)
}

export function getWeekday(date: string): number {
  const day = parseDate(date).getUTCDay()
  return day === 0 ? 7 : day
}

export function getTeachingWeek(date: string): number {
  const difference = parseDate(date).getTime() - parseDate(SEMESTER_START).getTime()
  return Math.floor(difference / 86_400_000 / 7) + 1
}

function isWithin(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

export function resolveAcademicDate(
  date: string,
  exceptions: CalendarException[],
): AcademicDate | null {
  const makeup = exceptions.find((item) => item.kind === 'makeup' && item.date === date)
  if (makeup?.kind === 'makeup') {
    return {
      date,
      sourceDate: makeup.sourceDate,
      weekday: getWeekday(makeup.sourceDate),
      teachingWeek: getTeachingWeek(makeup.sourceDate),
      kind: 'makeup',
      label: makeup.label,
    }
  }

  const suspended = exceptions.some(
    (item) => item.kind === 'suspension' && isWithin(date, item.start, item.end),
  )
  if (suspended) return null

  return {
    date,
    sourceDate: date,
    weekday: getWeekday(date),
    teachingWeek: getTeachingWeek(date),
    kind: 'regular',
  }
}

export function expandCourseOccurrences(
  rules: CourseRule[],
  range: DateRange,
  exceptions: CalendarException[],
  overrides: CourseOverride[],
): CourseOccurrence[] {
  const results: CourseOccurrence[] = []
  for (let date = range.start; date <= range.end; date = addDays(date, 1)) {
    const academicDate = resolveAcademicDate(date, exceptions)
    if (!academicDate) continue

    for (const rule of rules) {
      if (rule.weekday !== academicDate.weekday || !rule.weeks.includes(academicDate.teachingWeek)) {
        continue
      }
      const id = `${rule.id}@${date}`
      const override = overrides.find((item) => item.occurrenceId === id)
      if (override?.action === 'cancel') continue

      results.push({
        ...rule,
        ...(override?.action === 'update'
          ? {
              startPeriod: override.startPeriod ?? rule.startPeriod,
              endPeriod: override.endPeriod ?? rule.endPeriod,
              teacher: override.teacher ?? rule.teacher,
              location: override.location ?? rule.location,
              note: override.note,
            }
          : {}),
        id,
        ruleId: rule.id,
        date,
        sourceDate: academicDate.sourceDate,
        teachingWeek: academicDate.teachingWeek,
        kind: academicDate.kind,
        exceptionLabel: academicDate.label,
      })
    }
  }
  return results.sort((a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod)
}

export function teachingWeekRange(week: number): DateRange {
  const start = addDays(SEMESTER_START, (week - 1) * 7)
  return { start, end: addDays(start, 6) }
}
