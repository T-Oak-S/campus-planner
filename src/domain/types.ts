export type ISODate = `${number}-${number}-${number}`

export interface DateRange {
  start: string
  end: string
}

export interface CourseRule {
  id: string
  courseName: string
  teacher: string
  location: string
  weekday: number
  startPeriod: number
  endPeriod: number
  weeks: number[]
  color: string
}

export interface CourseOccurrence extends CourseRule {
  id: string
  ruleId: string
  date: string
  sourceDate: string
  teachingWeek: number
  kind: 'regular' | 'makeup'
  exceptionLabel?: string
  note?: string
}

export interface CourseOverride {
  id: string
  occurrenceId: string
  action: 'cancel' | 'update'
  startPeriod?: number
  endPeriod?: number
  teacher?: string
  location?: string
  note?: string
}

export type CalendarException =
  | {
      id: string
      kind: 'suspension'
      start: string
      end: string
      label: string
    }
  | {
      id: string
      kind: 'makeup'
      date: string
      sourceDate: string
      label: string
    }

export interface AcademicDate {
  date: string
  sourceDate: string
  weekday: number
  teachingWeek: number
  kind: 'regular' | 'makeup'
  label?: string
}

export interface PeriodTime {
  period: number
  start: string
  end: string
}

export type Priority = 'high' | 'medium' | 'low'

export interface ActivityOverride {
  date: string
  action: 'cancel' | 'update'
  title?: string
  start?: string
  end?: string
  location?: string
  notes?: string
}

export interface Activity {
  id: string
  title: string
  date: string
  start: string
  end: string
  location: string
  notes: string
  recurrence: 'none' | 'weekly'
  recurrenceEnd?: string
  overrides?: ActivityOverride[]
  updatedAt: string
}

export interface ActivityOccurrence extends Omit<Activity, 'overrides'> {
  occurrenceId: string
  sourceActivityId: string
}

export interface PlannerTask {
  id: string
  title: string
  dueAt: string
  priority: Priority
  completed: boolean
  courseId?: string
  notes: string
  updatedAt: string
}

export interface PlannerSettings {
  dayStart: string
  dayEnd: string
  reminderMinutes: number
  periods: PeriodTime[]
}

export interface PlannerData {
  version: 1
  activities: Activity[]
  tasks: PlannerTask[]
  courseOverrides: CourseOverride[]
  settings: PlannerSettings
  updatedAt: string
}
