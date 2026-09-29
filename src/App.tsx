import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, CloudOff, LoaderCircle, RefreshCw } from 'lucide-react'
import { AppNav, type ViewName } from './components/AppNav'
import { ActivityForm, type ActivityDraft } from './components/ActivityForm'
import { CourseForm } from './components/CourseForm'
import { Modal } from './components/Modal'
import { TaskForm, type TaskDraft } from './components/TaskForm'
import { createPlannerRepository } from './data/supabaseRepository'
import type { PlannerRepository } from './data/repository'
import { calculateFreeSlots, expandActivityOccurrences, type TimedBlock } from './domain/activities'
import { applyActivityEdit } from './domain/activityEdits'
import { exportBackup, importBackup } from './domain/backup'
import { expandCourseOccurrences, getTeachingWeek, teachingWeekRange } from './domain/calendar'
import { buildIcsCalendar, type CalendarExportItem } from './domain/ics'
import { activityExportRange } from './domain/exportRange'
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

function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
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
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)
  const planner = usePlanner(repository)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  const data = planner.data
  const todayCourses = useMemo(() => data ? expandCourseOccurrences(courseRules, { start: date, end: date }, calendarExceptions, data.courseOverrides) : [], [data, date])
  const todayActivities = useMemo(() => data ? expandActivityOccurrences(data.activities, { start: date, end: date }) : [], [data, date])
  const weekRange = teachingWeekRange(selectedWeek)
  const semesterRange = useMemo(() => ({ start: '2026-09-20', end: '2027-01-24' }), [])
  const semesterCourses = useMemo(() => data ? expandCourseOccurrences(courseRules, semesterRange, calendarExceptions, data.courseOverrides) : [], [data, semesterRange])
  const semesterActivities = useMemo(() => data ? expandActivityOccurrences(data.activities, semesterRange) : [], [data, semesterRange])

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
  const readOnly = repository.mode === 'cloud' && !online

  function allowEdit(action: () => void) {
    if (readOnly) setNotice('当前离线，云端数据只能查看')
    else action()
  }

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
      return { ...current, activities: applyActivityEdit(current.activities, existing, draft, () => uniqueId('activity'), new Date().toISOString()) }
    }).then((result) => { if (result.status !== 'error') setActivityDialog(null) })
  }

  function deleteActivity(scope: 'series' | 'occurrence') {
    const occurrence = activityDialog?.occurrence
    if (!occurrence) return
    void planner.updateData((current) => ({ ...current, activities: scope === 'series'
      ? current.activities.filter((item) => item.id !== occurrence.sourceActivityId)
      : current.activities.map((item) => item.id === occurrence.sourceActivityId ? { ...item, overrides: [...(item.overrides ?? []).filter((override) => override.date !== occurrence.date), { date: occurrence.date, action: 'cancel' as const }] } : item) }))
    if (!readOnly) setActivityDialog(null)
  }

  function saveTask(draft: TaskDraft) {
    const existing = taskDialog !== 'new' ? taskDialog : undefined
    void planner.updateData((current) => ({ ...current, tasks: existing ? current.tasks.map((task) => task.id === existing.id ? { ...task, ...draft, courseId: draft.courseId || undefined, updatedAt: new Date().toISOString() } : task) : [...current.tasks, { id: uniqueId('task'), ...draft, courseId: draft.courseId || undefined, completed: false, updatedAt: new Date().toISOString() }] }))
    if (!readOnly) setTaskDialog(null)
  }

  function saveCourseOverride(course: CourseOccurrence, values: { startPeriod: number; endPeriod: number; teacher: string; location: string; note: string }) {
    void planner.updateData((current) => ({ ...current, courseOverrides: [...current.courseOverrides.filter((item) => item.occurrenceId !== course.id), { id: uniqueId('course-override'), occurrenceId: course.id, action: 'update' as const, ...values }] }))
    setCourseDialog(null)
  }

  function cancelCourse(course: CourseOccurrence) {
    void planner.updateData((current) => ({ ...current, courseOverrides: [...current.courseOverrides.filter((item) => item.occurrenceId !== course.id), { id: uniqueId('course-override'), occurrenceId: course.id, action: 'cancel' as const }] }))
    setCourseDialog(null)
  }

  function exportCalendar() {
    if (!data) return
    const courses = expandCourseOccurrences(courseRules, semesterRange, calendarExceptions, data.courseOverrides)
    const personalRange = activityExportRange(data.activities)
    const activities = personalRange ? expandActivityOccurrences(data.activities, personalRange) : []
    const items: CalendarExportItem[] = [
      ...courses.flatMap((course) => {
        const start = periodMap.get(course.startPeriod)?.start
        const end = periodMap.get(course.endPeriod)?.end
        return start && end ? [{ id: course.id, title: course.courseName, start: `${course.date}T${start}`, end: `${course.date}T${end}`, location: course.location, description: `第${course.teachingWeek}周 · ${course.teacher}${course.kind === 'makeup' ? ' · 补课' : ''}${course.note ? ` · ${course.note}` : ''}` }] : []
      }),
      ...activities.map((activity) => ({ id: activity.occurrenceId, title: activity.title, start: `${activity.date}T${activity.start}`, end: `${activity.date}T${activity.end}`, location: activity.location, description: activity.notes })),
      ...data.tasks.filter((task) => !task.completed).map((task) => ({ id: task.id, title: `截止：${task.title}`, start: task.dueAt, end: addMinutesLocal(task.dueAt, 30), location: '', description: task.notes })),
    ]
    downloadText('校园安排.ics', buildIcsCalendar(items, data.settings.reminderMinutes), 'text/calendar;charset=utf-8')
    setNotice(`已导出 ${items.length} 项日历安排`)
  }

  const courseOptions = Array.from(new Map(courseRules.map((course) => [course.courseName, { id: course.id, name: course.courseName }])).values())
  const selectedActivityBase = activityDialog?.occurrence ? data.activities.find((item) => item.id === activityDialog.occurrence?.sourceActivityId) : undefined
  const selectedActivityForForm = selectedActivityBase && activityDialog?.occurrence ? { ...selectedActivityBase, title: activityDialog.occurrence.title, start: activityDialog.occurrence.start, end: activityDialog.occurrence.end, location: activityDialog.occurrence.location, notes: activityDialog.occurrence.notes } : selectedActivityBase
  const conflictActivities = expandActivityOccurrences(data.activities, { start: '2026-08-01', end: '2027-08-31' })
  const conflictCourses = semesterCourses
  const nowTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())

  return (
    <div className="app-shell">
      <AppNav active={view} onChange={setView} />
      <main className="app-main">
        <div className="top-status">
          {planner.saveStatus === 'saving' && <span><LoaderCircle className="spin" size={14} />正在保存</span>}
          {planner.saveStatus === 'saved' && <span className="success"><Check size={14} />已保存</span>}
          {planner.saveStatus === 'error' && <button type="button" onClick={planner.retrySave}><AlertTriangle size={14} />{planner.saveMessage}<RefreshCw size={13} /></button>}
        </div>
        {readOnly && <div className="offline-banner"><CloudOff size={16} />当前离线：可以查看最近数据，恢复网络后再编辑。</div>}
        {view === 'today' && <TodayPage date={date} teachingWeek={getTeachingWeek(date)} courses={todayCourses} activities={todayActivities} tasks={data.tasks} periods={data.settings.periods} nowLocal={`${date}T${nowTime}`} freeSlots={freeSlots} periodsConfigured={periodsConfigured} onAddActivity={() => allowEdit(() => setActivityDialog({ date }))} onOpenCalendar={() => setView('calendar')} onOpenTasks={() => setView('tasks')} onEditActivity={(occurrence) => allowEdit(() => setActivityDialog({ date: occurrence.date, occurrence }))} />}
        {view === 'calendar' && <CalendarPage week={selectedWeek} onWeekChange={setSelectedWeek} courses={semesterCourses} activities={semesterActivities} onAddActivity={(targetDate = weekRange.start) => allowEdit(() => setActivityDialog({ date: targetDate }))} onEditActivity={(occurrence) => allowEdit(() => setActivityDialog({ date: occurrence.date, occurrence }))} onEditCourse={(course) => allowEdit(() => setCourseDialog(course))} />}
        {view === 'tasks' && <TasksPage tasks={data.tasks} onAdd={() => allowEdit(() => setTaskDialog('new'))} onToggle={(id) => allowEdit(() => { void planner.updateData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed, updatedAt: new Date().toISOString() } : task) })) })} onEdit={(task) => allowEdit(() => setTaskDialog(task))} />}
        {view === 'settings' && <SettingsPage settings={data.settings} repository={repository} user={planner.user} readOnly={readOnly} onSaveSettings={(settings) => allowEdit(() => { void planner.updateData((current) => ({ ...current, settings })).then((result) => { if (result.status === 'saved') setNotice('作息设置已保存') }) })} onExportIcs={exportCalendar} onExportBackup={() => downloadText('校园时序备份.json', exportBackup(data), 'application/json')} onImportBackup={(file) => allowEdit(() => { void readFileText(file).then((text) => { const imported = importBackup(text); return planner.updateData(() => imported) }).then((result) => { if (result.status === 'saved') setNotice('备份已恢复') }).catch(() => setNotice('备份文件无效，请检查后重试')) })} onSignedOut={() => { void planner.signOut() }} />}
      </main>

      {notice && <button type="button" className="toast" onClick={() => setNotice('')}>{notice}<span>×</span></button>}
      {activityDialog && <Modal title={activityDialog.occurrence ? '编辑安排' : '添加安排'} onClose={() => setActivityDialog(null)}><ActivityForm initialDate={activityDialog.date} activity={selectedActivityForForm} occurrenceDate={activityDialog.occurrence?.date} occupied={[...courseBlocks(conflictCourses), ...activityBlocks(conflictActivities)]} onSave={saveActivity} onDelete={activityDialog.occurrence ? deleteActivity : undefined} onCancel={() => setActivityDialog(null)} /></Modal>}
      {taskDialog && <Modal title={taskDialog === 'new' ? '添加任务' : '编辑任务'} onClose={() => setTaskDialog(null)}><TaskForm initialDate={date} task={taskDialog === 'new' ? undefined : taskDialog} courseOptions={courseOptions} onSave={saveTask} onCancel={() => setTaskDialog(null)} /></Modal>}
      {courseDialog && <Modal title="调整本次课程" onClose={() => setCourseDialog(null)}><CourseForm course={courseDialog} onSave={(values) => saveCourseOverride(courseDialog, values)} onCancelCourse={() => cancelCourse(courseDialog)} onClose={() => setCourseDialog(null)} /></Modal>}
      {planner.conflict && <Modal title="发现同步冲突" onClose={planner.useRemoteVersion}><div className="conflict-dialog"><AlertTriangle size={34} /><p>这台设备和云端都修改了数据。请选择保留哪个版本。</p><div className="form-actions"><button type="button" className="secondary-button" onClick={planner.useRemoteVersion}>使用云端版本</button><button type="button" className="primary-button" onClick={planner.keepLocalVersion}>保留本机版本</button></div></div></Modal>}
    </div>
  )
}
