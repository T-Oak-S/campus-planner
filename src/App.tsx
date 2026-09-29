import { useMemo, useState } from 'react'
import { AlertTriangle, Check, CloudOff, LoaderCircle, RefreshCw } from 'lucide-react'
import { AppNav, type ViewName } from './components/AppNav'
import { ActivityForm, type ActivityDraft } from './components/ActivityForm'
import { CourseForm } from './components/CourseForm'
import { Modal } from './components/Modal'
import { TaskForm, type TaskDraft } from './components/TaskForm'
import { createPlannerRepository } from './data/supabaseRepository'
import type { PlannerRepository } from './data/repository'
import { calculateFreeSlots, expandActivityOccurrences, type TimedBlock } from './domain/activities'
import { exportBackup, importBackup } from './domain/backup'
import { expandCourseOccurrences, getTeachingWeek, teachingWeekRange } from './domain/calendar'
import { buildIcsCalendar, type CalendarExportItem } from './domain/ics'
import type { Activity, ActivityOccurrence, CourseOccurrence, PlannerTask } from './domain/types'
import { calendarExceptions, courseRules } from './data/defaultSchedule'
import { usePlanner } from './hooks/usePlanner'
import { CalendarPage } from './pages/CalendarPage'
import { SettingsPage } from './pages/SettingsPage'
import { TasksPage } from './pages/TasksPage'
import { TodayPage } from './pages/TodayPage'

interface AppProps {
  initialDate?: string
  repository?: PlannerRepository
}

function todayInShanghai(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function uniqueId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function addMinutesLocal(value: string, minutes: number): string {
  const date = new Date(`${value}:00+08:00`)
  date.setMinutes(date.getMinutes() + minutes)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date).reduce<Record<string, string>>((map, part) => ({ ...map, [part.type]: part.value }), {})
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export default function App({ initialDate, repository: suppliedRepository }: AppProps) {
  const repository = useMemo(() => suppliedRepository ?? createPlannerRepository(), [suppliedRepository])
  const date = initialDate ?? todayInShanghai()
  const initialWeek = Math.max(1, Math.min(18, getTeachingWeek(date)))
  const [view, setView] = useState<ViewName>('today')
  const [selectedWeek, setSelectedWeek] = useState(initialWeek)
  const [activityDialog, setActivityDialog] = useState<{ date: string; occurrence?: ActivityOccurrence } | null>(null)
  const [taskDialog, setTaskDialog] = useState<PlannerTask | 'new' | null>(null)
  const [courseDialog, setCourseDialog] = useState<CourseOccurrence | null>(null)
  const [notice, setNotice] = useState('')
  const planner = usePlanner(repository)

  const data = planner.data
  const todayCourses = useMemo(() => data ? expandCourseOccurrences(courseRules, { start: date, end: date }, calendarExceptions, data.courseOverrides) : [], [data, date])
  const todayActivities = useMemo(() => data ? expandActivityOccurrences(data.activities, { start: date, end: date }) : [], [data, date])
  const weekRange = teachingWeekRange(selectedWeek)
  const weekCourses = useMemo(() => data ? expandCourseOccurrences(courseRules, weekRange, calendarExceptions, data.courseOverrides) : [], [data, weekRange.start, weekRange.end])
  const weekActivities = useMemo(() => data ? expandActivityOccurrences(data.activities, weekRange) : [], [data, weekRange.start, weekRange.end])

  if (!data) return <div className="loading-screen"><LoaderCircle className="spin" size={28} /><span>正在整理你的时间……</span></div>

  const periodMap = new Map(data.settings.periods.map((period) => [period.period, period]))
  const courseBlocks = (courses: CourseOccurrence[]): TimedBlock[] => courses.flatMap((course) => {
    const start = periodMap.get(course.startPeriod)?.start
    const end = periodMap.get(course.endPeriod)?.end
    return start && end ? [{ id: course.id, title: course.courseName, startAt: `${course.date}T${start}`, endAt: `${course.date}T${end}` }] : []
  })
  const activityBlocks = (activities: ActivityOccurrence[]): TimedBlock[] => activities.map((activity) => ({
    id: activity.sourceActivityId, title: activity.title, startAt: `${activity.date}T${activity.start}`, endAt: `${activity.date}T${activity.end}`,
  }))
  const occupiedToday = [...courseBlocks(todayCourses), ...activityBlocks(todayActivities)]
  const periodsConfigured = data.settings.periods.length === 13
  const freeSlots = periodsConfigured ? calculateFreeSlots(date, data.settings.dayStart, data.settings.dayEnd, occupiedToday) : []

  function saveActivity(draft: ActivityDraft) {
    const existing = activityDialog?.occurrence
    void planner.updateData((current) => {
      if (!existing) {
        const activity: Activity = {
          id: uniqueId('activity'), title: draft.title.trim(), date: draft.date, start: draft.start, end: draft.end,
          location: draft.location.trim(), notes: draft.notes.trim(), recurrence: draft.recurrence,
          recurrenceEnd: draft.recurrence === 'weekly' ? draft.recurrenceEnd : undefined, updatedAt: new Date().toISOString(),
        }
        return { ...current, activities: [...current.activities, activity] }
      }
      const source = current.activities.find((item) => item.id === existing.sourceActivityId)
      if (!source) return current
      if (draft.editScope === 'series') {
        return { ...current, activities: current.activities.map((item) => item.id === source.id ? {
          ...item, title: draft.title.trim(), date: draft.date, start: draft.start, end: draft.end,
          location: draft.location.trim(), notes: draft.notes.trim(), recurrence: draft.recurrence,
          recurrenceEnd: draft.recurrence === 'weekly' ? draft.recurrenceEnd : undefined, updatedAt: new Date().toISOString(),
        } : item) }
      }
      if (draft.date !== existing.date) {
        const moved: Activity = { ...source, id: uniqueId('activity'), title: draft.title.trim(), date: draft.date, start: draft.start, end: draft.end, location: draft.location.trim(), notes: draft.notes.trim(), recurrence: 'none', recurrenceEnd: undefined, overrides: undefined, updatedAt: new Date().toISOString() }
        return { ...current, activities: [...current.activities.map((item) => item.id === source.id ? { ...item, overrides: [...(item.overrides ?? []), { date: existing.date, action: 'cancel' as const }] } : item), moved] }
      }
      return { ...current, activities: current.activities.map((item) => item.id === source.id ? { ...item, overrides: [...(item.overrides ?? []).filter((override) => override.date !== existing.date), { date: existing.date, action: 'update' as const, title: draft.title.trim(), start: draft.start, end: draft.end, location: draft.location.trim(), notes: draft.notes.trim() }] } : item) }
    })
    setActivityDialog(null)
  }

  function deleteActivity(scope: 'series' | 'occurrence') {
    const occurrence = activityDialog?.occurrence
    if (!occurrence) return
    void planner.updateData((current) => ({ ...current, activities: scope === 'series'
      ? current.activities.filter((item) => item.id !== occurrence.sourceActivityId)
      : current.activities.map((item) => item.id === occurrence.sourceActivityId ? { ...item, overrides: [...(item.overrides ?? []).filter((override) => override.date !== occurrence.date), { date: occurrence.date, action: 'cancel' as const }] } : item) }))
    setActivityDialog(null)
  }

  function saveTask(draft: TaskDraft) {
    const existing = taskDialog !== 'new' ? taskDialog : undefined
    void planner.updateData((current) => ({ ...current, tasks: existing ? current.tasks.map((task) => task.id === existing.id ? { ...task, ...draft, courseId: draft.courseId || undefined, updatedAt: new Date().toISOString() } : task) : [...current.tasks, { id: uniqueId('task'), ...draft, courseId: draft.courseId || undefined, completed: false, updatedAt: new Date().toISOString() }] }))
    setTaskDialog(null)
  }

  function saveCourseOverride(course: CourseOccurrence, values: { startPeriod: number; endPeriod: number; teacher: string; location: string }) {
    void planner.updateData((current) => ({ ...current, courseOverrides: [...current.courseOverrides.filter((item) => item.occurrenceId !== course.id), { id: uniqueId('course-override'), occurrenceId: course.id, action: 'update' as const, ...values }] }))
    setCourseDialog(null)
  }

  function cancelCourse(course: CourseOccurrence) {
    void planner.updateData((current) => ({ ...current, courseOverrides: [...current.courseOverrides.filter((item) => item.occurrenceId !== course.id), { id: uniqueId('course-override'), occurrenceId: course.id, action: 'cancel' as const }] }))
    setCourseDialog(null)
  }

  function exportCalendar() {
    if (!data) return
    const semesterRange = { start: '2026-09-20', end: '2027-01-24' }
    const courses = expandCourseOccurrences(courseRules, semesterRange, calendarExceptions, data.courseOverrides)
    const activities = expandActivityOccurrences(data.activities, semesterRange)
    const items: CalendarExportItem[] = [
      ...courses.flatMap((course) => {
        const start = periodMap.get(course.startPeriod)?.start
        const end = periodMap.get(course.endPeriod)?.end
        return start && end ? [{ id: course.id, title: course.courseName, start: `${course.date}T${start}`, end: `${course.date}T${end}`, location: course.location, description: `第${course.teachingWeek}周 · ${course.teacher}${course.kind === 'makeup' ? ' · 补课' : ''}` }] : []
      }),
      ...activities.map((activity) => ({ id: activity.occurrenceId, title: activity.title, start: `${activity.date}T${activity.start}`, end: `${activity.date}T${activity.end}`, location: activity.location, description: activity.notes })),
      ...data.tasks.filter((task) => !task.completed).map((task) => ({ id: task.id, title: `截止：${task.title}`, start: task.dueAt, end: addMinutesLocal(task.dueAt, 30), location: '', description: task.notes })),
    ]
    downloadText('校园安排.ics', buildIcsCalendar(items, data.settings.reminderMinutes), 'text/calendar;charset=utf-8')
    setNotice(`已导出 ${items.length} 项日历安排`)
  }

  const courseOptions = Array.from(new Map(courseRules.map((course) => [course.courseName, { id: course.id, name: course.courseName }])).values())
  const selectedActivityBase = activityDialog?.occurrence ? data.activities.find((item) => item.id === activityDialog.occurrence?.sourceActivityId) : undefined
  const dialogDate = activityDialog?.date ?? date
  const dialogActivities = expandActivityOccurrences(data.activities, { start: dialogDate, end: dialogDate })
  const dialogCourses = expandCourseOccurrences(courseRules, { start: dialogDate, end: dialogDate }, calendarExceptions, data.courseOverrides)

  return (
    <div className="app-shell">
      <AppNav active={view} onChange={setView} />
      <main className="app-main">
        <div className="top-status">
          {planner.saveStatus === 'saving' && <span><LoaderCircle className="spin" size={14} />正在保存</span>}
          {planner.saveStatus === 'saved' && <span className="success"><Check size={14} />已保存</span>}
          {planner.saveStatus === 'error' && <button type="button" onClick={planner.retrySave}><AlertTriangle size={14} />{planner.saveMessage}<RefreshCw size={13} /></button>}
        </div>
        {repository.mode === 'cloud' && !navigator.onLine && <div className="offline-banner"><CloudOff size={16} />当前离线：可以查看最近数据，恢复网络后再编辑。</div>}
        {view === 'today' && <TodayPage date={date} teachingWeek={getTeachingWeek(date)} courses={todayCourses} activities={todayActivities} tasks={data.tasks} freeSlots={freeSlots} periodsConfigured={periodsConfigured} onAddActivity={() => setActivityDialog({ date })} onOpenCalendar={() => setView('calendar')} onOpenTasks={() => setView('tasks')} onEditActivity={(occurrence) => setActivityDialog({ date: occurrence.date, occurrence })} />}
        {view === 'calendar' && <CalendarPage week={selectedWeek} onWeekChange={setSelectedWeek} courses={weekCourses} activities={weekActivities} onAddActivity={(targetDate = weekRange.start) => setActivityDialog({ date: targetDate })} onEditActivity={(occurrence) => setActivityDialog({ date: occurrence.date, occurrence })} onEditCourse={setCourseDialog} />}
        {view === 'tasks' && <TasksPage tasks={data.tasks} onAdd={() => setTaskDialog('new')} onToggle={(id) => { void planner.updateData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed, updatedAt: new Date().toISOString() } : task) })) }} onEdit={setTaskDialog} />}
        {view === 'settings' && <SettingsPage settings={data.settings} repository={repository} user={planner.user} onSaveSettings={(settings) => { void planner.updateData((current) => ({ ...current, settings })); setNotice('作息设置已保存') }} onExportIcs={exportCalendar} onExportBackup={() => downloadText('校园时序备份.json', exportBackup(data), 'application/json')} onImportBackup={(file) => { void file.text().then((text) => { const imported = importBackup(text); return planner.updateData(() => imported) }).then(() => setNotice('备份已恢复')).catch(() => setNotice('备份文件无效，请检查后重试')) }} onSignedOut={() => { void planner.refreshUser() }} />}
      </main>

      {notice && <button type="button" className="toast" onClick={() => setNotice('')}>{notice}<span>×</span></button>}
      {activityDialog && <Modal title={activityDialog.occurrence ? '编辑安排' : '添加安排'} onClose={() => setActivityDialog(null)}><ActivityForm initialDate={activityDialog.date} activity={selectedActivityBase} occurrenceDate={activityDialog.occurrence?.date} occupied={[...courseBlocks(dialogCourses), ...activityBlocks(dialogActivities)]} onSave={saveActivity} onDelete={activityDialog.occurrence ? deleteActivity : undefined} onCancel={() => setActivityDialog(null)} /></Modal>}
      {taskDialog && <Modal title={taskDialog === 'new' ? '添加任务' : '编辑任务'} onClose={() => setTaskDialog(null)}><TaskForm initialDate={date} task={taskDialog === 'new' ? undefined : taskDialog} courseOptions={courseOptions} onSave={saveTask} onCancel={() => setTaskDialog(null)} /></Modal>}
      {courseDialog && <Modal title="调整本次课程" onClose={() => setCourseDialog(null)}><CourseForm course={courseDialog} onSave={(values) => saveCourseOverride(courseDialog, values)} onCancelCourse={() => cancelCourse(courseDialog)} onClose={() => setCourseDialog(null)} /></Modal>}
      {planner.conflict && <Modal title="发现同步冲突" onClose={planner.useRemoteVersion}><div className="conflict-dialog"><AlertTriangle size={34} /><p>这台设备和云端都修改了数据。请选择保留哪个版本。</p><div className="form-actions"><button type="button" className="secondary-button" onClick={planner.useRemoteVersion}>使用云端版本</button><button type="button" className="primary-button" onClick={planner.keepLocalVersion}>保留本机版本</button></div></div></Modal>}
    </div>
  )
}
