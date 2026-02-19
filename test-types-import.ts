import { MonthSpan, GridLine, WeekendBlock } from '@/types';
const monthSpan: MonthSpan = { month: new Date(), days: 31, startIndex: 0 };
const gridLine: GridLine = { x: 0, isMonthStart: true, isWeekStart: false };
const weekendBlock: WeekendBlock = { left: 0, width: 80 };
console.log('Types are valid');
