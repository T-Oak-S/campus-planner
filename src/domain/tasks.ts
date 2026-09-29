import type { PlannerTask, Priority } from './types'

const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

export function sortTasks(tasks: PlannerTask[]): PlannerTask[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const dateComparison = a.dueAt.localeCompare(b.dueAt)
    if (dateComparison !== 0) return dateComparison
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

export function isTaskOverdue(task: PlannerTask, now = new Date()): boolean {
  return !task.completed && new Date(task.dueAt).getTime() < now.getTime()
}
