import type { Activity, ActivityOccurrence } from './types'

export interface ActivityEditDraft {
  title: string
  date: string
  start: string
  end: string
  location: string
  notes: string
  recurrence: 'none' | 'weekly'
  recurrenceEnd?: string
  editScope: 'series' | 'occurrence'
  dateChanged?: boolean
}

export function applyActivityEdit(
  activities: Activity[],
  occurrence: ActivityOccurrence,
  draft: ActivityEditDraft,
  createId: () => string,
  updatedAt: string,
): Activity[] {
  const source = activities.find((item) => item.id === occurrence.sourceActivityId)
  if (!source) return activities
  if (draft.editScope === 'series') {
    return activities.map((item) => item.id === source.id ? {
      ...item,
      title: draft.title.trim(),
      date: draft.dateChanged ? draft.date : source.date,
      start: draft.start,
      end: draft.end,
      location: draft.location.trim(),
      notes: draft.notes.trim(),
      recurrence: draft.recurrence,
      recurrenceEnd: draft.recurrence === 'weekly' ? draft.recurrenceEnd : undefined,
      updatedAt,
    } : item)
  }
  if (draft.date !== occurrence.date) {
    const moved: Activity = {
      ...source,
      id: createId(),
      title: draft.title.trim(),
      date: draft.date,
      start: draft.start,
      end: draft.end,
      location: draft.location.trim(),
      notes: draft.notes.trim(),
      recurrence: 'none',
      recurrenceEnd: undefined,
      overrides: undefined,
      updatedAt,
    }
    return [
      ...activities.map((item) => item.id === source.id ? {
        ...item,
        overrides: [...(item.overrides ?? []).filter((override) => override.date !== occurrence.date), { date: occurrence.date, action: 'cancel' as const }],
      } : item),
      moved,
    ]
  }
  return activities.map((item) => item.id === source.id ? {
    ...item,
    overrides: [...(item.overrides ?? []).filter((override) => override.date !== occurrence.date), {
      date: occurrence.date,
      action: 'update' as const,
      title: draft.title.trim(),
      start: draft.start,
      end: draft.end,
      location: draft.location.trim(),
      notes: draft.notes.trim(),
    }],
  } : item)
}
