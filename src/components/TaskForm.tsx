import { useState } from 'react'
import type { PlannerTask, Priority } from '../domain/types'

export interface TaskDraft {
  title: string
  dueAt: string
  priority: Priority
  courseId?: string
  notes: string
}

export function TaskForm({ initialDate, task, courseOptions, onSave, onCancel }: {
  initialDate: string
  task?: PlannerTask
  courseOptions: Array<{ id: string; name: string }>
  onSave: (draft: TaskDraft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<TaskDraft>({
    title: task?.title ?? '',
    dueAt: task?.dueAt ?? `${initialDate}T20:00`,
    priority: task?.priority ?? 'medium',
    courseId: task?.courseId ?? '',
    notes: task?.notes ?? '',
  })
  const [error, setError] = useState('')

  return (
    <form className="form-stack" onSubmit={(event) => {
      event.preventDefault()
      if (!draft.title.trim()) { setError('任务名称不能为空'); return }
      if (!draft.dueAt) { setError('请选择截止时间'); return }
      onSave(draft)
    }}>
      <label className="field full"><span>任务名称</span><input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：完成高数第一章作业" /></label>
      <div className="form-grid">
        <label className="field"><span>截止时间</span><input type="datetime-local" value={draft.dueAt} onChange={(event) => setDraft({ ...draft, dueAt: event.target.value })} /></label>
        <label className="field"><span>优先级</span><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
        <label className="field full"><span>关联课程</span><select value={draft.courseId} onChange={(event) => setDraft({ ...draft, courseId: event.target.value })}><option value="">不关联课程</option>{courseOptions.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
      </div>
      <label className="field full"><span>备注</span><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions"><span className="action-spacer" /><button type="button" className="secondary-button" onClick={onCancel}>取消</button><button type="submit" className="primary-button">保存任务</button></div>
    </form>
  )
}
