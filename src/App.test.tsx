import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { createLocalRepository } from './data/localRepository'

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
    expect(await screen.findByText('晚间自习')).toBeInTheDocument()
    expect(screen.getByText('图书馆')).toBeInTheDocument()
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
