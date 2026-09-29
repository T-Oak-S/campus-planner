import type { Activity, DateRange } from './types'

export function activityExportRange(activities: Activity[]): DateRange | null {
  if (!activities.length) return null
  const starts = activities.map((activity) => activity.date)
  const ends = activities.map((activity) => activity.recurrence === 'weekly' ? activity.recurrenceEnd ?? activity.date : activity.date)
  return { start: starts.sort()[0], end: ends.sort().at(-1) as string }
}
