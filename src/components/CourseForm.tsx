import { useState } from 'react'
import type { CourseOccurrence } from '../domain/types'

export function CourseForm({ course, onSave, onCancelCourse, onClose }: {
  course: CourseOccurrence
  onSave: (values: { startPeriod: number; endPeriod: number; teacher: string; location: string }) => void
  onCancelCourse: () => void
  onClose: () => void
}) {
  const [startPeriod, setStartPeriod] = useState(course.startPeriod)
  const [endPeriod, setEndPeriod] = useState(course.endPeriod)
  const [teacher, setTeacher] = useState(course.teacher)
  const [location, setLocation] = useState(course.location)
  return (
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); onSave({ startPeriod, endPeriod, teacher, location }) }}>
      <div className="course-summary" style={{ '--course-color': course.color } as React.CSSProperties}>
        <span className="course-dot" />
        <div><strong>{course.courseName}</strong><span>{course.date} · 第 {course.teachingWeek} 周{course.kind === 'makeup' ? ' · 补课' : ''}</span></div>
      </div>
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
