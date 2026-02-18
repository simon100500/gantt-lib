/**
 * Task data structure for Gantt chart
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Display name of the task */
  name: string;
  /** Task start date (ISO string or Date object) */
  startDate: string | Date;
  /** Task end date (ISO string or Date object) */
  endDate: string | Date;
  /** Optional color for task bar visualization */
  color?: string;
}

/**
 * Date range for Gantt chart display
 */
export interface GanttDateRange {
  /** Start date of the visible range */
  start: Date;
  /** End date of the visible range */
  end: Date;
}

/**
 * Task bar positioning and dimensions
 */
export interface TaskBarGeometry {
  /** Left position in pixels */
  left: number;
  /** Width in pixels */
  width: number;
}

/**
 * Grid configuration for layout calculations
 */
export interface GridConfig {
  /** Width of each day column in pixels */
  dayWidth: number;
  /** Height of each task row in pixels */
  rowHeight: number;
}
