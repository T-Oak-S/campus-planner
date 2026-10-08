import { CalendarRange, ChevronLeft, ChevronRight, ListFilter, MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import { addDays, getTeachingWeek, teachingWeekRange } from '../domain/calendar'
import type { ActivityOccurrence, CourseOccurrence, PeriodTime } from '../domain/types'
import { datesOfRange, formatShortDate, weekdayLabels } from '../ui/date'

function courseTimeLabel(course: CourseOccurrence, periods: PeriodTime[]): string {
  const periodMap = new Map(periods.map((period) => [period.period, period]))
  const start = periodMap.get(course.startPeriod)?.start
  const end = periodMap.get(course.endPeriod)?.end
  const periodsLabel = `第 ${course.startPeriod}–${course.endPeriod} 节`
  return start && end ? `${start}–${end} · ${periodsLabel}` : periodsLabel
}

export function CalendarPage({ week, onWeekChange, courses, activities, periods, onAddActivity, onEditActivity, onEditCourse }: {
  week: number
  onWeekChange: (week: number) => void
  courses: CourseOccurrence[]
  activities: ActivityOccurrence[]
  periods: PeriodTime[]
  onAddActivity: (date?: string) => void
  onEditActivity: (activity: ActivityOccurrence) => void
  onEditCourse: (course: CourseOccurrence) => void
}) {
  const [mode, setMode] = useState<'week' | 'month'>('week')
  const range = teachingWeekRange(week)
  const dates = datesOfRange(range.start, 7)

  return (
    <div className="page calendar-page">
      <header className="page-header"><div><span className="eyebrow">时间全貌</span><h1>日历</h1><p>课程会随教学周自动变化，个人安排不会因放假消失。</p></div><button type="button" className="primary-button" onClick={() => onAddActivity()}><Plus size={18} />添加安排</button></header>
      <div className="calendar-toolbar">
        <div className="view-switch"><button type="button" className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}><CalendarRange size={16} />周视图</button><button type="button" className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}><ListFilter size={16} />月视图</button></div>
        <div className="week-switcher"><button type="button" className="icon-button" aria-label="上一周" disabled={week <= 1} onClick={() => onWeekChange(Math.max(1, week - 1))}><ChevronLeft size={20} /></button><div><h2>第 {week} 周</h2><span>{formatShortDate(range.start)} — {formatShortDate(range.end)}</span></div><button type="button" className="icon-button" aria-label="下一周" disabled={week >= 18} onClick={() => onWeekChange(Math.min(18, week + 1))}><ChevronRight size={20} /></button></div>
        <button type="button" className="secondary-button" onClick={() => onWeekChange(Math.max(1, Math.min(18, getTeachingWeek(new Date().toISOString().slice(0, 10)))))}>回到本周</button>
      </div>
      {mode === 'week' ? (
        <section className="week-board" aria-label={`第 ${week} 周课表`}>
          {dates.map((date, index) => {
            const dayCourses = courses.filter((course) => course.date === date)
            const dayActivities = activities.filter((activity) => activity.date === date)
            return <div className={`day-column ${index >= 5 ? 'weekend' : ''}`} key={date}>
              <div className="day-heading"><span>{weekdayLabels[index]}</span><strong>{date.slice(8)}</strong></div>
              <div className="day-items">
                {dayCourses.map((course) => <button type="button" key={course.id} className="calendar-course" style={{ '--course-color': course.color } as React.CSSProperties} onClick={() => onEditCourse(course)}><span>{courseTimeLabel(course, periods)}</span><strong>{course.courseName}</strong><small><MapPin size={11} />{course.location}</small>{course.kind === 'makeup' && <em>补课</em>}</button>)}
                {dayActivities.map((activity) => <button type="button" key={activity.occurrenceId} className="calendar-activity" onClick={() => onEditActivity(activity)}><span>{activity.start}–{activity.end}</span><strong>{activity.title}</strong><small>{activity.location || '个人安排'}</small></button>)}
                {!dayCourses.length && !dayActivities.length && <button type="button" className="day-add" onClick={() => onAddActivity(date)}>＋</button>}
              </div>
            </div>
          })}
        </section>
      ) : <MonthView anchor={range.start} courses={courses} activities={activities} periods={periods} onAddActivity={onAddActivity} onEditActivity={onEditActivity} onEditCourse={onEditCourse} />}
      <div className="calendar-legend"><span><i className="legend-course" />课程</span><span><i className="legend-activity" />个人安排</span><small>点击卡片可调整单次课程或安排</small></div>
    </div>
  )
}

function MonthView({ anchor, courses, activities, periods, onAddActivity, onEditActivity, onEditCourse }: {
  anchor: string
  courses: CourseOccurrence[]
  activities: ActivityOccurrence[]
  periods: PeriodTime[]
  onAddActivity: (date?: string) => void
  onEditActivity: (activity: ActivityOccurrence) => void
  onEditCourse: (course: CourseOccurrence) => void
}) {
  const [selectedDate, setSelectedDate] = useState(anchor)
  const monthStart = `${anchor.slice(0, 7)}-01`
  const weekday = new Date(`${monthStart}T12:00:00+08:00`).getDay() || 7
  const gridStart = addDays(monthStart, -(weekday - 1))
  const days = datesOfRange(gridStart, 42)
  const selectedCourses = courses.filter((item) => item.date === selectedDate)
  const selectedActivities = activities.filter((item) => item.date === selectedDate)
  return <div className="month-layout"><section className="month-board" aria-label={`${anchor.slice(0, 7)} 月视图`}>
      {weekdayLabels.map((label) => <span className="month-weekday" key={label}>{label}</span>)}
      {days.map((date) => {
        const count = courses.filter((item) => item.date === date).length + activities.filter((item) => item.date === date).length
        return <button type="button" aria-label={`${date}，${count} 项安排`} key={date} className={`month-day ${date.slice(0, 7) !== anchor.slice(0, 7) ? 'outside' : ''} ${selectedDate === date ? 'selected' : ''}`} onClick={() => setSelectedDate(date)}><strong>{Number(date.slice(8))}</strong>{count > 0 && <span>{count} 项</span>}</button>
      })}
    </section>
    <section className="panel month-day-details"><div className="panel-heading"><div><span className="eyebrow">所选日期</span><h2>{selectedDate}</h2></div><button type="button" className="secondary-button" onClick={() => onAddActivity(selectedDate)}><Plus size={16} />添加</button></div>
      {!selectedCourses.length && !selectedActivities.length && <p className="soft-empty">这一天没有安排。</p>}
      {[...selectedCourses.map((item) => ({ id: item.id, title: item.courseName, detail: courseTimeLabel(item, periods), onClick: () => onEditCourse(item) })), ...selectedActivities.map((item) => ({ id: item.occurrenceId, title: item.title, detail: `${item.start}–${item.end}`, onClick: () => onEditActivity(item) }))].map((item) => <button type="button" className="month-detail-item" key={item.id} onClick={item.onClick}><strong>{item.title}</strong><span>{item.detail}</span></button>)}
    </section>
  </div>
}
