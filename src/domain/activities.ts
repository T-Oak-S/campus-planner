import { addDays } from './calendar'
import type { Activity, ActivityOccurrence, DateRange } from './types'

export interface TimedBlock {
  id: string
  title: string
  startAt: string
  endAt: string
}

export interface FreeSlot {
  start: string
  end: string
  minutes: number
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function minutes(time: string): number {
  const match = TIME_PATTERN.exec(time)
  if (!match) throw new Error('时间格式无效')
  return Number(match[1]) * 60 + Number(match[2])
}

function timeFromMinutes(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

export function validateActivity(activity: Activity): Activity {
  if (!activity.title.trim()) throw new Error('安排名称不能为空')
  if (!isValidDate(activity.date)) throw new Error('安排日期无效')
  if (minutes(activity.end) <= minutes(activity.start)) {
    throw new Error('结束时间必须晚于开始时间')
  }
  if (activity.recurrence === 'weekly' && (!activity.recurrenceEnd || activity.recurrenceEnd < activity.date)) {
    throw new Error('重复结束日期无效')
  }
  if (activity.recurrenceEnd && !isValidDate(activity.recurrenceEnd)) throw new Error('重复结束日期无效')
  return activity
}

export function expandActivityOccurrences(
  activities: Activity[],
  range: DateRange,
): ActivityOccurrence[] {
  const occurrences: ActivityOccurrence[] = []
  for (const activity of activities) {
    validateActivity(activity)
    const lastDate = activity.recurrence === 'weekly' ? activity.recurrenceEnd ?? activity.date : activity.date
    const increment = activity.recurrence === 'weekly' ? 7 : Number.POSITIVE_INFINITY
    for (let date = activity.date; date <= lastDate; date = addDays(date, increment)) {
      if (date < range.start || date > range.end) {
        if (increment === Number.POSITIVE_INFINITY) break
        continue
      }
      const override = activity.overrides?.find((item) => item.date === date)
      if (override?.action === 'cancel') {
        if (increment === Number.POSITIVE_INFINITY) break
        continue
      }
      occurrences.push({
        ...activity,
        ...(override?.action === 'update'
          ? {
              title: override.title ?? activity.title,
              start: override.start ?? activity.start,
              end: override.end ?? activity.end,
              location: override.location ?? activity.location,
              notes: override.notes ?? activity.notes,
            }
          : {}),
        date,
        occurrenceId: `${activity.id}@${date}`,
        sourceActivityId: activity.id,
      })
      if (increment === Number.POSITIVE_INFINITY) break
    }
  }
  return occurrences.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
}

function isValidBlock(block: TimedBlock): boolean {
  return block.startAt < block.endAt
}

export function detectConflicts(candidate: TimedBlock, occupied: TimedBlock[]): TimedBlock[] {
  if (!isValidBlock(candidate)) throw new Error('安排时间无效')
  return occupied.filter(
    (block) => isValidBlock(block) && candidate.startAt < block.endAt && candidate.endAt > block.startAt,
  )
}

export function calculateFreeSlots(
  date: string,
  dayStart: string,
  dayEnd: string,
  occupied: TimedBlock[],
  minimumMinutes = 30,
): FreeSlot[] {
  const start = minutes(dayStart)
  const end = minutes(dayEnd)
  if (end <= start) throw new Error('每日可用时间范围无效')

  const ranges = occupied
    .filter((block) => block.startAt.slice(0, 10) === date && isValidBlock(block))
    .map((block) => ({
      start: Math.max(start, minutes(block.startAt.slice(11, 16))),
      end: Math.min(end, minutes(block.endAt.slice(11, 16))),
    }))
    .filter((range) => range.end > start && range.start < end)
    .sort((a, b) => a.start - b.start)

  const merged: Array<{ start: number; end: number }> = []
  for (const range of ranges) {
    const previous = merged.at(-1)
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end)
    else merged.push({ ...range })
  }

  const slots: FreeSlot[] = []
  let cursor = start
  for (const range of merged) {
    if (range.start - cursor >= minimumMinutes) {
      slots.push({ start: timeFromMinutes(cursor), end: timeFromMinutes(range.start), minutes: range.start - cursor })
    }
    cursor = Math.max(cursor, range.end)
  }
  if (end - cursor >= minimumMinutes) {
    slots.push({ start: timeFromMinutes(cursor), end: timeFromMinutes(end), minutes: end - cursor })
  }
  return slots
}
