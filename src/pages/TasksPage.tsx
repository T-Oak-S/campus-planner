import { Check, Circle, Plus } from 'lucide-react'
import type { PlannerTask } from '../domain/types'
import { sortTasks } from '../domain/tasks'
import { formatDateTime } from '../ui/date'

const priorityLabel = { high: '高优先级', medium: '中优先级', low: '低优先级' }

export function TasksPage({ tasks, onAdd, onToggle, onEdit }: {
  tasks: PlannerTask[]
  onAdd: () => void
  onToggle: (id: string) => void
  onEdit: (task: PlannerTask) => void
}) {
  const sorted = sortTasks(tasks)
  const completed = tasks.filter((task) => task.completed).length
  return (
    <div className="page">
      <header className="page-header"><div><span className="eyebrow">清单</span><h1>任务</h1><p>{tasks.length ? `已完成 ${completed}/${tasks.length}` : '把作业、考试和报名截止日期放在一起。'}</p></div><button type="button" className="primary-button" onClick={onAdd}><Plus size={18} />添加任务</button></header>
      <section className="panel task-panel">
        <div className="task-tabs"><span className="active">全部 {tasks.length}</span><span>进行中 {tasks.length - completed}</span><span>已完成 {completed}</span></div>
        <div className="task-list">
          {sorted.length === 0 && <div className="empty-state large"><Circle size={34} /><strong>还没有任务</strong><p>记录第一个截止日期，之后就不用一直惦记。</p><button type="button" className="secondary-button" onClick={onAdd}>创建任务</button></div>}
          {sorted.map((task) => (
            <article className={`task-row ${task.completed ? 'completed' : ''}`} key={task.id}>
              <label className="task-check"><input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} aria-label={task.title} /><span>{task.completed && <Check size={14} />}</span></label>
              <button type="button" className="task-main" onClick={() => onEdit(task)}><strong>{task.title}</strong><small>{formatDateTime(task.dueAt)} 截止{task.notes ? ` · ${task.notes}` : ''}</small></button>
              <span className={`priority-pill ${task.priority}`}>{priorityLabel[task.priority]}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
