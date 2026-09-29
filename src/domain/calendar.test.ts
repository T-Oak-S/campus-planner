import { describe, expect, it } from 'vitest'
import {
  expandCourseOccurrences,
  getTeachingWeek,
  resolveAcademicDate,
} from './calendar'
import { calendarExceptions, courseRules } from '../data/defaultSchedule'

describe('教学周计算', () => {
  it.each([
    ['2026-09-21', 1],
    ['2026-11-16', 9],
    ['2026-11-30', 11],
    ['2026-12-21', 14],
    ['2027-01-04', 16],
  ])('%s 属于第 %i 教学周', (date, week) => {
    expect(getTeachingWeek(date)).toBe(week)
  })

  it('假期不会改变后续教学周编号', () => {
    expect(getTeachingWeek('2026-10-12')).toBe(4)
  })
})

describe('校历例外', () => {
  it.each(['2026-09-25', '2026-10-01', '2026-11-05', '2027-01-11'])(
    '%s 停止课程但仍保留日期',
    (date) => {
      const result = expandCourseOccurrences(courseRules, { start: date, end: date }, calendarExceptions, [])
      expect(result).toEqual([])
    },
  )

  it('9月20日按10月6日星期二、第3周的规则补课', () => {
    expect(resolveAcademicDate('2026-09-20', calendarExceptions)).toEqual({
      date: '2026-09-20',
      sourceDate: '2026-10-06',
      weekday: 2,
      teachingWeek: 3,
      kind: 'makeup',
      label: '补 10月6日（星期二）的课',
    })
    const names = expandCourseOccurrences(
      courseRules,
      { start: '2026-09-20', end: '2026-09-20' },
      calendarExceptions,
      [],
    ).map((item) => item.courseName)
    expect(names).toEqual(['工科高等代数', '国际交流英语', '程序设计与计算思维', '计算机大类新生研讨'])
  })

  it('10月10日按10月7日星期三、第3周的规则补课', () => {
    const occurrences = expandCourseOccurrences(
      courseRules,
      { start: '2026-10-10', end: '2026-10-10' },
      calendarExceptions,
      [],
    )
    expect(occurrences.map((item) => item.courseName)).toEqual(['高等数学分析I', '概论'])
    expect(occurrences.every((item) => item.teachingWeek === 3)).toBe(true)
  })
})

describe('课程规则与单次调整', () => {
  it('第9周星期四保留同一课程的两段独立规则', () => {
    const occurrences = expandCourseOccurrences(
      courseRules,
      { start: '2026-11-19', end: '2026-11-19' },
      calendarExceptions,
      [],
    ).filter((item) => item.courseName === '程序设计与计算思维')
    expect(occurrences.map(({ startPeriod, endPeriod, teacher }) => ({ startPeriod, endPeriod, teacher }))).toEqual([
      { startPeriod: 6, endPeriod: 7, teacher: '孔佑勇' },
      { startPeriod: 8, endPeriod: 10, teacher: '曹玲玲' },
    ])
  })

  it('单次取消只移除指定课程，其余课程保留', () => {
    const monday = expandCourseOccurrences(
      courseRules,
      { start: '2026-09-21', end: '2026-09-21' },
      calendarExceptions,
      [{ id: 'override-1', occurrenceId: 'math-mon@2026-09-21', action: 'cancel' }],
    )
    expect(monday.some((item) => item.id === 'math-mon@2026-09-21')).toBe(false)
    expect(monday).toHaveLength(2)
  })
})
