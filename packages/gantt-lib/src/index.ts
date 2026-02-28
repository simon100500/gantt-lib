'use client';

// CSS import triggers tsup to emit dist/index.css (renamed to dist/styles.css by onSuccess)
import './styles.css';

// Components
export { GanttChart, type Task, type TaskDependency, type GanttChartProps } from './components/GanttChart';
export { default as TaskRow } from './components/TaskRow';
export { default as TimeScaleHeader } from './components/TimeScaleHeader';
export { default as GridBackground } from './components/GridBackground';
export { default as TodayIndicator } from './components/TodayIndicator';
export { default as DragGuideLines } from './components/DragGuideLines/DragGuideLines';
export { TaskList, type TaskListProps } from './components/TaskList';

// UI Components
export { Input, type InputProps } from './components/ui/Input';
export { Button, type ButtonProps } from './components/ui/Button';
export { Popover, PopoverTrigger, PopoverContent, type PopoverProps, type PopoverContentProps } from './components/ui/Popover';
export { Calendar, type CalendarProps } from './components/ui/Calendar';
export { DatePicker, type DatePickerProps } from './components/ui/DatePicker';

// Hooks
export { useTaskDrag } from './hooks';

// Utils
export * from './utils';

// Types
export type {
  GanttDateRange,
  TaskBarGeometry,
  GridConfig,
  MonthSpan,
  GridLine,
  WeekendBlock,
} from './types';
