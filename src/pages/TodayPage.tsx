import { ArrowRight, CalendarClock, CheckCircle2, Clock3, MapPin, Plus, Sparkles } from 'lucide-react'
import type { FreeSlot } from '../domain/activities'
import type { ActivityOccurrence, CourseOccurrence, PlannerTask } from '../domain/types'
import { formatChineseDate, formatDateTime } from '../ui/date'

export function TodayPage({ date, teachingWeek, courses, activities, tasks, freeSlots, periodsConfigured, onAddActivity, onOpenCalendar, onOpenTasks, onEditActivity }: {
  date: string
  teachingWeek: number
  courses: CourseOccurrence[]
  activities: ActivityOccurrence[]
  tasks: PlannerTask[]
  freeSlots: FreeSlot[]
  periodsConfigured: boolean
  onAddActivity: () => void
  onOpenCalendar: () => void
  onOpenTasks: () => void
  onEditActivity: (activity: ActivityOccurrence) => void
}) {
  const timeline = [
    ...courses.map((course) => ({
      id: course.id, kind: 'course' as const, sort: course.startPeriod,
      title: course.courseName, time: `第 ${course.startPeriod}–${course.endPeriod} 节`,
      detail: `${course.teacher} · ${course.location}`, color: course.color, course,
    })),
    ...activities.map((activity) => ({
      id: activity.occurrenceId, kind: 'activity' as const, sort: 100 + Number(activity.start.replace(':', '.')),
      title: activity.title, time: `${activity.start}–${activity.end}`,
      detail: activity.location || '个人安排', color: '#6d5ce7', activity,
    })),
  ].sort((a, b) => a.sort - b.sort)
  const next = timeline[0]
  const pending = tasks.filter((task) => !task.completed).slice(0, 3)

  return (
    <div className="page page-today">
      <header className="page-header today-header">
        <div><span className="eyebrow">{formatChineseDate(date, true)}</span><h1>今天，慢慢把事情做好</h1><p>课程、任务和自己的时间，都在这里。</p></div>
        <button type="button" className="primary-button add-button" onClick={onAddActivity}><Plus size={18} />添加安排</button>
      </header>

      <section className="hero-grid">
        <article className="week-card">
          <div className="week-card-top"><span>本学期进度</span><Sparkles size={18} /></div>
          <strong>第 {teachingWeek} 教学周</strong>
          <div className="progress-track"><span style={{ width: `${Math.min(100, Math.max(0, teachingWeek / 18 * 100))}%` }} /></div>
          <small>共 18 个教学周 · 保持自己的节奏</small>
        </article>
        <article className="next-card">
          <span className="card-kicker"><CalendarClock size={16} />下一项</span>
          {next ? <><strong>{next.title}</strong><p>{next.time}</p><small>{next.detail}</small></> : <><strong>今天没有安排</strong><p>留一点时间给自己</p></>}
          <button type="button" className="text-button" onClick={onOpenCalendar}>查看完整日历 <ArrowRight size={15} /></button>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="panel timeline-panel">
          <div className="panel-heading"><div><span className="eyebrow">今日时间线</span><h2>{timeline.length} 项安排</h2></div><Clock3 size={21} /></div>
          <div className="timeline">
            {timeline.length === 0 && <div className="empty-state"><span>☁</span><strong>今天很清爽</strong><p>添加一个安排，给空闲时间一个方向。</p></div>}
            {timeline.map((item) => (
              <button type="button" key={item.id} className="timeline-item" style={{ '--item-color': item.color } as React.CSSProperties} onClick={() => item.kind === 'activity' && onEditActivity(item.activity)}>
                <span className="timeline-time">{item.time}</span><span className="timeline-line"><i /></span>
                <span className="timeline-content"><strong>{item.title}</strong><small><MapPin size={13} />{item.detail}</small></span>
              </button>
            ))}
          </div>
        </section>

        <aside className="side-stack">
          <section className="panel compact-panel">
            <div className="panel-heading"><div><span className="eyebrow">待办提醒</span><h2>快到期的任务</h2></div><button type="button" className="text-button" onClick={onOpenTasks}>全部</button></div>
            <div className="mini-task-list">
              {pending.length === 0 && <p className="soft-empty">暂时没有待办，轻松一下吧。</p>}
              {pending.map((task) => <div className="mini-task" key={task.id}><span className={`priority-dot ${task.priority}`} /><div><strong>{task.title}</strong><small>{formatDateTime(task.dueAt)} 截止</small></div></div>)}
            </div>
          </section>
          <section className="panel compact-panel free-panel">
            <div className="panel-heading"><div><span className="eyebrow">今日空闲</span><h2>可以利用的时间</h2></div><CheckCircle2 size={20} /></div>
            {!periodsConfigured ? <div className="setup-hint"><p>填写各节课的时间后，就能自动计算课程之间的空档。</p><button type="button" className="text-button" onClick={onOpenCalendar}>先看看课表</button></div> : freeSlots.length ? <div className="free-slots">{freeSlots.slice(0, 3).map((slot) => <span key={slot.start}><b>{slot.start}–{slot.end}</b><small>{slot.minutes} 分钟</small></span>)}</div> : <p className="soft-empty">今天的时间已安排得很充实。</p>}
          </section>
        </aside>
      </div>
    </div>
  )
}
