export interface CalendarExportItem {
  id: string
  title: string
  start: string
  end: string
  location: string
  description: string
}

function escapeIcs(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')
}

function formatLocalDateTime(value: string): string {
  return value.replaceAll('-', '').replace(':', '').replace('T', 'T') + '00'
}

function formatUtcDateTime(date: Date): string {
  return date.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z')
}

export function buildIcsCalendar(
  items: CalendarExportItem[],
  reminderMinutes = 15,
  generatedAt = new Date(),
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campus Planner//ZH-CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:我的校园安排',
    'X-WR-TIMEZONE:Asia/Shanghai',
  ]

  for (const item of items) {
    if (!item.start || !item.end || item.end <= item.start) {
      throw new Error('日历事件时间无效')
    }
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcs(item.id)}@campus-planner`,
      `DTSTAMP:${formatUtcDateTime(generatedAt)}`,
      `DTSTART;TZID=Asia/Shanghai:${formatLocalDateTime(item.start)}`,
      `DTEND;TZID=Asia/Shanghai:${formatLocalDateTime(item.end)}`,
      `SUMMARY:${escapeIcs(item.title)}`,
      `LOCATION:${escapeIcs(item.location)}`,
      `DESCRIPTION:${escapeIcs(item.description)}`,
      'BEGIN:VALARM',
      `TRIGGER:-PT${reminderMinutes}M`,
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcs(item.title)}`,
      'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}
