import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ActivityForm } from './ActivityForm'

describe('安排冲突提示', () => {
  it('修改日期后按新日期重新检查冲突', async () => {
    const user = userEvent.setup()
    render(<ActivityForm initialDate="2026-09-29" occupied={[
      { id: 'other', title: '已有安排', startAt: '2026-09-30T19:00', endAt: '2026-09-30T20:00' },
    ]} onSave={vi.fn()} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText('安排名称'), '新安排')
    await user.clear(screen.getByLabelText('日期'))
    await user.type(screen.getByLabelText('日期'), '2026-09-30')
    expect(screen.getByText('发现 1 个时间冲突')).toBeInTheDocument()
  })

  it('每周重复会检查后续日期的冲突', async () => {
    const user = userEvent.setup()
    render(<ActivityForm initialDate="2026-09-29" occupied={[
      { id: 'other', title: '下周已有安排', startAt: '2026-10-06T19:00', endAt: '2026-10-06T20:00' },
    ]} onSave={vi.fn()} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText('安排名称'), '每周自习')
    await user.selectOptions(screen.getByLabelText(/重复/), 'weekly')
    await user.type(screen.getByLabelText('重复至'), '2026-10-20')
    expect(screen.getByText('发现 1 个时间冲突')).toBeInTheDocument()
  })
})
