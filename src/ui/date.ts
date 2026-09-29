import { addDays } from '../domain/calendar'

export const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function formatChineseDate(date: string, includeYear = false): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: includeYear ? 'numeric' : undefined,
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(`${date}T12:00:00+08:00`))
}

export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' })
    .format(new Date(`${date}T12:00:00+08:00`))
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(`${value}+08:00`))
}

export function datesOfRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(start, index))
}
