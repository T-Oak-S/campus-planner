import { describe, expect, it } from 'vitest'
import { buildIcsCalendar } from './ics'

describe('日历导出', () => {
  it('生成北京时间事件并包含默认提前15分钟提醒', () => {
    const ics = buildIcsCalendar([
      {
        id: 'math@2026-09-21',
        title: '高等数学分析I',
        start: '2026-09-21T08:00',
        end: '2026-09-21T09:35',
        location: '东南院-103',
        description: '第1周',
      },
    ])
    expect(ics).toContain('DTSTART;TZID=Asia/Shanghai:20260921T080000')
    expect(ics).toContain('DTEND;TZID=Asia/Shanghai:20260921T093500')
    expect(ics).toContain('TRIGGER:-PT15M')
  })

  it('正确转义逗号、分号、换行和反斜杠', () => {
    const ics = buildIcsCalendar([
      {
        id: 'event',
        title: '讨论,复习;答疑',
        start: '2026-09-21T18:00',
        end: '2026-09-21T19:00',
        location: '线上\\会议室',
        description: '第一行\n第二行',
      },
    ])
    expect(ics).toContain('SUMMARY:讨论\\,复习\\;答疑')
    expect(ics).toContain('LOCATION:线上\\\\会议室')
    expect(ics).toContain('DESCRIPTION:第一行\\n第二行')
  })

  it('拒绝结束时间不晚于开始时间的事件', () => {
    expect(() => buildIcsCalendar([{ id: 'bad', title: '错误', start: '2026-09-21T20:00', end: '2026-09-21T19:00', location: '', description: '' }])).toThrow('日历事件时间无效')
  })
})
