import { describe, expect, it } from 'vitest'
import type { PlannerTask } from './types'
import { sortTasks } from './tasks'

const makeTask = (overrides: Partial<PlannerTask>): PlannerTask => ({
  id: 'task',
  title: '任务',
  dueAt: '2026-09-30T20:00',
  priority: 'medium',
  completed: false,
  notes: '',
  updatedAt: '2026-09-20T10:00:00+08:00',
  ...overrides,
})

describe('任务排序', () => {
  it('未完成任务按截止时间排列，已完成任务放到最后', () => {
    const tasks = [
      makeTask({ id: 'done', completed: true, dueAt: '2026-09-21T08:00' }),
      makeTask({ id: 'later', dueAt: '2026-09-25T08:00' }),
      makeTask({ id: 'soon', dueAt: '2026-09-22T08:00' }),
    ]
    expect(sortTasks(tasks).map((task) => task.id)).toEqual(['soon', 'later', 'done'])
  })

  it('截止时间相同时按高、中、低优先级排列且不修改原数组', () => {
    const tasks = [
      makeTask({ id: 'low', priority: 'low' }),
      makeTask({ id: 'high', priority: 'high' }),
      makeTask({ id: 'medium', priority: 'medium' }),
    ]
    expect(sortTasks(tasks).map((task) => task.id)).toEqual(['high', 'medium', 'low'])
    expect(tasks.map((task) => task.id)).toEqual(['low', 'high', 'medium'])
  })
})
