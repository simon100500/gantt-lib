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
