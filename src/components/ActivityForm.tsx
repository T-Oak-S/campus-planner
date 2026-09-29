import { useMemo, useState } from 'react'
import { AlertTriangle, MapPin, Repeat2 } from 'lucide-react'
import { detectConflicts, validateActivity, type TimedBlock } from '../domain/activities'
import type { Activity } from '../domain/types'

export interface ActivityDraft {
  title: string
  date: string
  start: string
  end: string
  location: string
  notes: string
  recurrence: 'none' | 'weekly'
  recurrenceEnd?: string
  editScope: 'series' | 'occurrence'
}

interface ActivityFormProps {
  initialDate: string
  activity?: Activity
  occurrenceDate?: string
  occupied: TimedBlock[]
  onSave: (draft: ActivityDraft) => void
  onDelete?: (scope: 'series' | 'occurrence') => void
  onCancel: () => void
}

export function ActivityForm({ initialDate, activity, occurrenceDate, occupied, onSave, onDelete, onCancel }: ActivityFormProps) {
  const [draft, setDraft] = useState<ActivityDraft>({
    title: activity?.title ?? '',
    date: occurrenceDate ?? activity?.date ?? initialDate,
    start: activity?.start ?? '19:00',
    end: activity?.end ?? '20:30',
    location: activity?.location ?? '',
    notes: activity?.notes ?? '',
    recurrence: activity?.recurrence ?? 'none',
    recurrenceEnd: activity?.recurrenceEnd ?? '',
    editScope: activity?.recurrence === 'weekly' ? 'occurrence' : 'series',
  })
  const [error, setError] = useState('')
  const [confirmConflicts, setConfirmConflicts] = useState(false)

  const conflicts = useMemo(() => {
    if (!draft.date || !draft.start || !draft.end || draft.end <= draft.start) return []
    return detectConflicts({
      id: activity?.id ?? 'new-activity', title: draft.title,
      startAt: `${draft.date}T${draft.start}`, endAt: `${draft.date}T${draft.end}`,
    }, occupied.filter((block) => block.id !== activity?.id))
  }, [activity?.id, draft.date, draft.end, draft.start, draft.title, occupied])

  function submit() {
    try {
      validateActivity({
        id: activity?.id ?? 'new', title: draft.title, date: draft.date,
        start: draft.start, end: draft.end, location: draft.location, notes: draft.notes,
        recurrence: draft.recurrence, recurrenceEnd: draft.recurrenceEnd || undefined,
        updatedAt: new Date().toISOString(),
      })
      if (conflicts.length > 0 && !confirmConflicts) {
        setConfirmConflicts(true)
        return
      }
      onSave(draft)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '请检查输入')
    }
  }

  return (
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); submit() }}>
      {activity?.recurrence === 'weekly' && (
        <fieldset className="segmented-field">
          <legend>修改范围</legend>
          <label><input type="radio" name="scope" checked={draft.editScope === 'occurrence'} onChange={() => setDraft({ ...draft, editScope: 'occurrence' })} />仅修改本次</label>
          <label><input type="radio" name="scope" checked={draft.editScope === 'series'} onChange={() => setDraft({ ...draft, editScope: 'series' })} />修改整个系列</label>
        </fieldset>
      )}
      <label className="field full"><span>安排名称</span><input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：图书馆自习" /></label>
      <div className="form-grid">
        <label className="field"><span>日期</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
        <label className="field"><span><Repeat2 size={15} />重复</span><select value={draft.recurrence} onChange={(event) => setDraft({ ...draft, recurrence: event.target.value as 'none' | 'weekly' })}><option value="none">不重复</option><option value="weekly">每周</option></select></label>
        <label className="field"><span>开始时间</span><input type="time" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} /></label>
        <label className="field"><span>结束时间</span><input type="time" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} /></label>
        {draft.recurrence === 'weekly' && <label className="field"><span>重复至</span><input type="date" value={draft.recurrenceEnd} onChange={(event) => setDraft({ ...draft, recurrenceEnd: event.target.value })} /></label>}
        <label className="field"><span><MapPin size={15} />地点</span><input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="可选" /></label>
      </div>
      <label className="field full"><span>备注</span><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="需要带什么、提前准备什么……" /></label>
      {error && <p className="form-error">{error}</p>}
      {conflicts.length > 0 && <div className="conflict-box"><AlertTriangle size={18} /><div><strong>发现 {conflicts.length} 个时间冲突</strong><span>{conflicts.map((item) => item.title).join('、')}</span></div></div>}
      <div className="form-actions">
        {activity && onDelete && <button type="button" className="danger-link" onClick={() => onDelete(draft.editScope)}>删除安排</button>}
        <span className="action-spacer" />
        <button type="button" className="secondary-button" onClick={onCancel}>取消</button>
        <button type="submit" className="primary-button">{confirmConflicts ? '仍然保存' : '保存安排'}</button>
      </div>
    </form>
  )
}
