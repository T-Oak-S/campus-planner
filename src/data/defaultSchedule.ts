import type { CalendarException, CourseRule } from '../domain/types'

const weeks = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index)

export const courseRules: CourseRule[] = [
  { id: 'math-mon', courseName: '高等数学分析I', teacher: '贺丹', location: '东南院-103', weekday: 1, startPeriod: 3, endPeriod: 4, weeks: weeks(1, 16), color: '#ff8f70' },
  { id: 'thinking-mon', courseName: '思辨与写作', teacher: '贾鸿雁', location: '中山院-101', weekday: 1, startPeriod: 6, endPeriod: 7, weeks: weeks(1, 16), color: '#e991b1' },
  { id: 'pe-mon', courseName: '体育I', teacher: '刘文龙', location: '四牌楼校区田径场（一）', weekday: 1, startPeriod: 8, endPeriod: 9, weeks: weeks(1, 16), color: '#f2b85b' },
  { id: 'algebra-tue', courseName: '工科高等代数', teacher: '周建华', location: '五四楼-206', weekday: 2, startPeriod: 1, endPeriod: 2, weeks: weeks(1, 16), color: '#f3c451' },
  { id: 'english-tue', courseName: '国际交流英语', teacher: '许希夷', location: '中山院-406', weekday: 2, startPeriod: 3, endPeriod: 4, weeks: weeks(1, 16), color: '#76b8ee' },
  { id: 'program-tue', courseName: '程序设计与计算思维', teacher: '孔佑勇', location: '中山院-310', weekday: 2, startPeriod: 6, endPeriod: 8, weeks: weeks(1, 16), color: '#7d8fe9' },
  { id: 'seminar-tue', courseName: '计算机大类新生研讨', teacher: '倪庆剑、倪维伟、吴文甲、李续、张静、李必信、陈立全、高志强', location: '五四楼-202', weekday: 2, startPeriod: 9, endPeriod: 10, weeks: weeks(1, 8), color: '#8b98c9' },
  { id: 'math-wed', courseName: '高等数学分析I', teacher: '贺丹', location: '东南院-103', weekday: 3, startPeriod: 1, endPeriod: 2, weeks: weeks(1, 16), color: '#ff8f70' },
  { id: 'ai-wed', courseName: '人工智能通识导论', teacher: '高志强', location: '中山院-311', weekday: 3, startPeriod: 3, endPeriod: 4, weeks: weeks(9, 16), color: '#62bdcb' },
  { id: 'overview-wed', courseName: '概论', teacher: '黄睿', location: '九五楼-101（截图待核对）', weekday: 3, startPeriod: 6, endPeriod: 8, weeks: weeks(1, 16), color: '#a8ca77' },
  { id: 'algebra-thu', courseName: '工科高等代数', teacher: '周建华', location: '五四楼-206', weekday: 4, startPeriod: 3, endPeriod: 5, weeks: weeks(1, 16), color: '#f3c451' },
  { id: 'program-thu-kong', courseName: '程序设计与计算思维', teacher: '孔佑勇', location: '中山院-310', weekday: 4, startPeriod: 6, endPeriod: 7, weeks: weeks(9, 12), color: '#7d8fe9' },
  { id: 'program-thu-cao-long', courseName: '程序设计与计算思维', teacher: '曹玲玲', location: '中山院-310', weekday: 4, startPeriod: 8, endPeriod: 10, weeks: weeks(4, 13), color: '#7d8fe9' },
  { id: 'program-thu-cao-week14', courseName: '程序设计与计算思维', teacher: '曹玲玲', location: '中山院-310', weekday: 4, startPeriod: 8, endPeriod: 9, weeks: [14], color: '#7d8fe9' },
  { id: 'finance-thu-1-10', courseName: '财经概论', teacher: '陈洪涛', location: '五四楼-107', weekday: 4, startPeriod: 11, endPeriod: 13, weeks: weeks(1, 10), color: '#76c579' },
  { id: 'finance-thu-11', courseName: '财经概论', teacher: '陈洪涛', location: '五四楼-107', weekday: 4, startPeriod: 11, endPeriod: 12, weeks: [11], color: '#76c579' },
  { id: 'math-fri', courseName: '高等数学分析I', teacher: '贺丹', location: '东南院-103', weekday: 5, startPeriod: 3, endPeriod: 4, weeks: weeks(1, 16), color: '#ff8f70' },
  { id: 'foundations-fri', courseName: '计算机科学的数学基础', teacher: '乔保果', location: '五四楼-209', weekday: 5, startPeriod: 6, endPeriod: 8, weeks: weeks(1, 16), color: '#64bfc0' },
]

export const calendarExceptions: CalendarException[] = [
  { id: 'makeup-national-tue', kind: 'makeup', date: '2026-09-20', sourceDate: '2026-10-06', label: '补 10月6日（星期二）的课' },
  { id: 'mid-autumn', kind: 'suspension', start: '2026-09-25', end: '2026-09-27', label: '中秋节放假' },
  { id: 'national-day', kind: 'suspension', start: '2026-10-01', end: '2026-10-07', label: '国庆节放假' },
  { id: 'makeup-national-wed', kind: 'makeup', date: '2026-10-10', sourceDate: '2026-10-07', label: '补 10月7日（星期三）的课' },
  { id: 'sports-meeting', kind: 'suspension', start: '2026-11-05', end: '2026-11-07', label: '校运会停课' },
  { id: 'exam-period', kind: 'suspension', start: '2027-01-11', end: '2027-01-24', label: '停课复习考试' },
]
