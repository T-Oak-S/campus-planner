import { Cloud, Database, Download, LogIn, LogOut, Save, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PlannerSettings, PeriodTime } from '../domain/types'
import type { PlannerRepository, PlannerUser } from '../data/repository'
import { validatePlannerSettings } from '../domain/settings'

const emptyPeriods = (): PeriodTime[] => Array.from({ length: 13 }, (_, index) => ({ period: index + 1, start: '', end: '' }))

export function SettingsPage({ settings, repository, user, readOnly = false, onSaveSettings, onExportIcs, onExportBackup, onImportBackup, onSignedOut }: {
  settings: PlannerSettings
  repository: PlannerRepository
  user: PlannerUser | null
  readOnly?: boolean
  onSaveSettings: (settings: PlannerSettings) => void
  onExportIcs: () => void
  onExportBackup: () => void
  onImportBackup: (file: File) => void
  onSignedOut: () => void
}) {
  const [periods, setPeriods] = useState<PeriodTime[]>(emptyPeriods())
  const [dayStart, setDayStart] = useState(settings.dayStart)
  const [dayEnd, setDayEnd] = useState(settings.dayEnd)
  const [reminderMinutes, setReminderMinutes] = useState(settings.reminderMinutes)
  const [error, setError] = useState('')

  useEffect(() => {
    const current = new Map(settings.periods.map((period) => [period.period, period]))
    setPeriods(emptyPeriods().map((period) => current.get(period.period) ?? period))
  }, [settings.periods])

  return (
    <div className="page">
      <header className="page-header"><div><span className="eyebrow">偏好与数据</span><h1>设置</h1><p>学校作息已经预填，课程会自动参与冲突检测和日历导出。</p></div></header>
      <div className="settings-grid">
        <div className="settings-main">
          <section className="panel settings-section">
            <div className="settings-title"><div className="settings-icon"><Cloud size={20} /></div><div><h2>账户与同步</h2><p>让手机和电脑保持一致。</p></div></div>
            <div className="account-card">
              {repository.isConfigured ? user ? <><div className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.email.slice(0, 1).toUpperCase()}</div><div><strong>{user.email}</strong><span>Supabase 云端同步已开启</span></div><button type="button" className="secondary-button" onClick={onSignedOut}><LogOut size={16} />退出</button></> : <><div className="avatar cloud"><Cloud size={19} /></div><div><strong>登录后自动同步</strong><span>使用 GitHub 账户登录</span></div><button type="button" className="primary-button" onClick={() => { void repository.signIn() }}><LogIn size={16} />GitHub 登录</button></> : <><div className="avatar local"><Database size={19} /></div><div><strong>本机模式</strong><span>数据保存在此浏览器，可随时导出备份</span></div><span className="status-badge">无需登录</span></>}
            </div>
          </section>

          <section className="panel settings-section">
            <div className="settings-title"><div className="settings-icon"><Save size={20} /></div><div><h2>课程作息时间</h2><p>已按学校作息预填；如有调整，可以直接修改对应节次。</p></div></div>
            <div className="period-table"><div className="period-row header"><span>节次</span><span>开始</span><span>结束</span></div>{periods.map((period) => <div className="period-row" key={period.period}><strong>第 {period.period} 节</strong><input disabled={readOnly} aria-label={`第${period.period}节开始`} type="time" value={period.start} onChange={(event) => setPeriods(periods.map((item) => item.period === period.period ? { ...item, start: event.target.value } : item))} /><input disabled={readOnly} aria-label={`第${period.period}节结束`} type="time" value={period.end} onChange={(event) => setPeriods(periods.map((item) => item.period === period.period ? { ...item, end: event.target.value } : item))} /></div>)}</div>
            <div className="inline-settings"><label className="field"><span>每日可用时间从</span><input disabled={readOnly} type="time" value={dayStart} onChange={(event) => setDayStart(event.target.value)} /></label><label className="field"><span>到</span><input disabled={readOnly} type="time" value={dayEnd} onChange={(event) => setDayEnd(event.target.value)} /></label><label className="field"><span>默认提前提醒</span><select disabled={readOnly} value={reminderMinutes} onChange={(event) => setReminderMinutes(Number(event.target.value))}><option value={5}>5 分钟</option><option value={15}>15 分钟</option><option value={30}>30 分钟</option><option value={60}>1 小时</option></select></label></div>
            {error && <p className="form-error">{error}</p>}
            <button disabled={readOnly} type="button" className="primary-button" onClick={() => {
              try {
                const next = { dayStart, dayEnd, reminderMinutes, periods: periods.filter((period) => period.start && period.end) }
                validatePlannerSettings(next)
                setError('')
                onSaveSettings(next)
              } catch (reason) { setError(reason instanceof Error ? reason.message : '请检查作息时间') }
            }}><Save size={17} />保存作息</button>
          </section>
        </div>

        <aside className="settings-side">
          <section className="panel settings-section"><div className="settings-title"><div className="settings-icon"><Download size={20} /></div><div><h2>日历提醒</h2><p>导入手机的专用日历，修改后重新替换。</p></div></div><button type="button" className="primary-button full-button" onClick={onExportIcs}><Download size={17} />导出日历文件</button><small className="section-note">只导出已具备实际时间的课程；个人安排始终会导出。</small></section>
          <section className="panel settings-section"><div className="settings-title"><div className="settings-icon"><Database size={20} /></div><div><h2>备份与恢复</h2><p>建议每月保存一次完整备份。</p></div></div><div className="backup-actions"><button type="button" className="secondary-button full-button" onClick={onExportBackup}><Download size={17} />导出备份</button><label className={`secondary-button full-button file-button ${readOnly ? 'disabled' : ''}`}><Upload size={17} />导入备份<input disabled={readOnly} aria-label="导入备份" type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImportBackup(file) }} /></label></div></section>
          <section className="tip-card"><strong>小提示</strong><p>任务的截止日期不会占用时间。需要预留写作业的时间时，请另外添加一项“自习”安排。</p></section>
        </aside>
      </div>
    </div>
  )
}
