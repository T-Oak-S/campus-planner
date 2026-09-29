import { useState } from 'react'
import type { CourseOccurrence } from '../domain/types'
import { validateCoursePeriodRange } from '../domain/settings'

export function CourseForm({ course, onSave, onCancelCourse, onClose }: {
  course: CourseOccurrence
  onSave: (values: { startPeriod: number; endPeriod: number; teacher: string; location: string; note: string }) => void
  onCancelCourse: () => void
  onClose: () => void
}) {
  const [startPeriod, setStartPeriod] = useState(course.startPeriod)
  const [endPeriod, setEndPeriod] = useState(course.endPeriod)
  const [teacher, setTeacher] = useState(course.teacher)
  const [location, setLocation] = useState(course.location)
  const [note, setNote] = useState(course.note ?? '')
  const [error, setError] = useState('')
  return (
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); try { validateCoursePeriodRange(startPeriod, endPeriod); setError(''); onSave({ startPeriod, endPeriod, teacher, location, note }) } catch (reason) { setError(reason instanceof Error ? reason.message : '请检查节次') } }}>
      <div className="course-summary" style={{ '--course-color': course.color } as React.CSSProperties}>
        <span className="course-dot" />
        <div><strong>{course.courseName}</strong><span>{course.date} · 第 {course.teachingWeek} 周{course.kind === 'makeup' ? ' · 补课' : ''}</span></div>
      </div>
      <label className="field full"><span>本次备注</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：改到实验室、携带材料" /></label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-grid">
        <label className="field"><span>开始节次</span><input type="number" min="1" max="13" value={startPeriod} onChange={(event) => setStartPeriod(Number(event.target.value))} /></label>
        <label className="field"><span>结束节次</span><input type="number" min="1" max="13" value={endPeriod} onChange={(event) => setEndPeriod(Number(event.target.value))} /></label>
        <label className="field"><span>教师</span><input value={teacher} onChange={(event) => setTeacher(event.target.value)} /></label>
        <label className="field"><span>地点</span><input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
      </div>
      <p className="helper-text">这里只修改这一次课程，不会影响其他教学周。</p>
      <div className="form-actions"><button type="button" className="danger-link" onClick={onCancelCourse}>取消本次课程</button><span className="action-spacer" /><button type="button" className="secondary-button" onClick={onClose}>关闭</button><button type="submit" className="primary-button">保存调整</button></div>
    </form>
  )
}
