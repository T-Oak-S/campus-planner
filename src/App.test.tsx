import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { createLocalRepository } from './data/localRepository'
import { createDefaultPlannerData, exportBackup } from './domain/backup'

function renderApp() {
  return render(<App initialDate="2026-09-29" repository={createLocalRepository(window.localStorage)} />)
}

describe('校园时间管理界面', () => {
  beforeEach(() => window.localStorage.clear())

  it('显示今天的教学周、课程和四个主入口', async () => {
    renderApp()
    expect(await screen.findByText('第 2 教学周')).toBeInTheDocument()
    expect(screen.getAllByText('工科高等代数').length).toBeGreaterThan(0)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '今日' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '日历' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '任务' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '设置' })).toBeInTheDocument()
  })

  it('新增个人安排后出现在今天时间线', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('第 2 教学周')
    await user.click(screen.getByRole('button', { name: '添加安排' }))
    const dialog = screen.getByRole('dialog', { name: '添加安排' })
    await user.type(within(dialog).getByLabelText('安排名称'), '晚间自习')
    await user.type(within(dialog).getByLabelText('地点'), '图书馆')
    await user.click(within(dialog).getByRole('button', { name: '保存安排' }))
    const timelineItem = await screen.findByRole('button', { name: /晚间自习/ })
    expect(within(timelineItem).getByText('晚间自习')).toBeInTheDocument()
    expect(within(timelineItem).getByText('图书馆')).toBeInTheDocument()
  })

  it('创建任务并可以标记完成', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('第 2 教学周')
    await user.click(screen.getByRole('button', { name: '任务' }))
    await user.click(screen.getByRole('button', { name: '添加任务' }))
    const dialog = screen.getByRole('dialog', { name: '添加任务' })
    await user.type(within(dialog).getByLabelText('任务名称'), '完成高数作业')
    await user.click(within(dialog).getByRole('button', { name: '保存任务' }))
    const checkbox = await screen.findByRole('checkbox', { name: '完成高数作业' })
    await user.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('周课表可以切换教学周', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('第 2 教学周')
    await user.click(screen.getByRole('button', { name: '日历' }))
    expect(screen.getByRole('heading', { name: '第 2 周' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下一周' }))
    expect(screen.getByRole('heading', { name: '第 3 周' })).toBeInTheDocument()
  })

  it('月视图展示所选周以外的当月课程', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('第 2 教学周')
    await user.click(screen.getByRole('button', { name: '日历' }))
    await user.click(screen.getByRole('button', { name: '月视图' }))
    expect(screen.getByRole('button', { name: '2026-09-21，3 项安排' })).toBeInTheDocument()
  })

  it('导入无效备份不会覆盖原数据', async () => {
    const current = createDefaultPlannerData()
    current.tasks.push({ id: 'keep', title: '保留任务', dueAt: '2026-10-01T10:00', priority: 'high', completed: false, notes: '', updatedAt: current.updatedAt })
    window.localStorage.setItem('campus-planner:data', exportBackup(current))
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('第 2 教学周')
    await user.click(screen.getByRole('button', { name: '设置' }))
    const invalid = { ...createDefaultPlannerData(), activities: [{ id: 'bad', title: '坏数据', date: '2026-09-29', start: '20:00', end: '20:00', location: '', notes: '', recurrence: 'none', updatedAt: new Date().toISOString() }] }
    await user.upload(screen.getByLabelText('导入备份'), new File([JSON.stringify(invalid)], 'bad.json', { type: 'application/json' }))
    expect(await screen.findByText('备份文件无效，请检查后重试')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem('campus-planner:data') ?? '{}').tasks[0].title).toBe('保留任务')
  })

  it('打开单次调整时显示生效值，修改系列不改变原始起点', async () => {
    const current = createDefaultPlannerData()
    current.activities = [{
      id: 'series', title: '自习', date: '2026-09-22', start: '19:00', end: '20:00', location: '图书馆', notes: '', recurrence: 'weekly', recurrenceEnd: '2026-10-20', updatedAt: current.updatedAt,
      overrides: [{ date: '2026-09-29', action: 'update', title: '小组自习', start: '18:00', location: '教室' }],
    }]
    window.localStorage.setItem('campus-planner:data', exportBackup(current))
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('第 2 教学周')
    await user.click(screen.getByRole('button', { name: '日历' }))
    await user.click(screen.getByRole('button', { name: /小组自习/ }))
    const dialog = screen.getByRole('dialog', { name: '编辑安排' })
    expect(within(dialog).getByLabelText('安排名称')).toHaveValue('小组自习')
    expect(within(dialog).getByLabelText('开始时间')).toHaveValue('18:00')
    expect(within(dialog).getByLabelText(/地点/)).toHaveValue('教室')
    await user.click(within(dialog).getByLabelText('修改整个系列'))
    await user.click(within(dialog).getByRole('button', { name: '保存安排' }))
    await screen.findByText('已保存')
    expect(JSON.parse(window.localStorage.getItem('campus-planner:data') ?? '{}').activities[0].date).toBe('2026-09-22')
  })

  it('设置页提供日历导出、备份和本地模式说明', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('第 2 教学周')
    await user.click(screen.getByRole('button', { name: '设置' }))
    expect(screen.getByText('本机模式')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '导出日历文件' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '导出备份' })).toBeInTheDocument()
    expect(screen.getByLabelText('导入备份')).toBeInTheDocument()
  })
})
