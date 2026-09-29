import type { ActivityOccurrence, CourseOccurrence, PeriodTime, PlannerTask } from './types'

export interface TodayTimelineItem {
  id: string
  kind: 'course' | 'activity'
  title: string
  time: string
  detail: string
  color: string
  start?: string
  end?: string
  activity?: ActivityOccurrence
}

export function buildTodaySummary(
  courses: CourseOccurrence[],
  activities: ActivityOccurrence[],
  tasks: PlannerTask[],
  periods: PeriodTime[],
  nowLocal: string,
) {
  const periodMap = new Map(periods.map((period) => [period.period, period]))
  const timeline: TodayTimelineItem[] = [
    ...courses.map((course) => ({
      id: course.id,
      kind: 'course' as const,
      title: course.courseName,
      time: `第 ${course.startPeriod}–${course.endPeriod} 节`,
      detail: `${course.teacher} · ${course.location}`,
      color: course.color,
      start: periodMap.get(course.startPeriod)?.start,
      end: periodMap.get(course.endPeriod)?.end,
    })),
    ...activities.map((activity) => ({
      id: activity.occurrenceId,
      kind: 'activity' as const,
      title: activity.title,
      time: `${activity.start}–${activity.end}`,
      detail: activity.location || '个人安排',
      color: '#6d5ce7',
      start: activity.start,
      end: activity.end,
      activity,
    })),
  ].sort((a, b) => (a.start ?? '99:99').localeCompare(b.start ?? '99:99'))
  const currentTime = nowLocal.slice(11, 16)
  const next = timeline.find((item) => !item.end || item.end > currentTime)
  const pending = tasks.filter((task) => !task.completed).sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 3)
  return { timeline, next, pending }
}
