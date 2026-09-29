import { CalendarDays, CheckSquare2, LayoutDashboard, Settings2 } from 'lucide-react'

export type ViewName = 'today' | 'calendar' | 'tasks' | 'settings'

const items = [
  { id: 'today' as const, label: '今日', icon: LayoutDashboard },
  { id: 'calendar' as const, label: '日历', icon: CalendarDays },
  { id: 'tasks' as const, label: '任务', icon: CheckSquare2 },
  { id: 'settings' as const, label: '设置', icon: Settings2 },
]

export function AppNav({ active, onChange }: { active: ViewName; onChange: (view: ViewName) => void }) {
  return (
    <nav className="app-nav" aria-label="主导航">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">序</span>
        <div><strong>校园时序</strong><small>Campus Planner</small></div>
      </div>
      <div className="nav-items">
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={active === id ? 'active' : ''} onClick={() => onChange(id)} aria-current={active === id ? 'page' : undefined}>
            <Icon size={20} strokeWidth={1.9} /><span>{label}</span>
          </button>
        ))}
      </div>
      <div className="nav-semester"><span>2026 秋季学期</span><small>第 1–18 周</small></div>
    </nav>
  )
}
