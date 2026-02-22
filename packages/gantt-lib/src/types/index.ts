/**
 * Dependency link types following PM standard
 * - FS (Finish-to-Start): Predecessor must finish before successor starts
 * - SS (Start-to-Start): Predecessor must start before successor starts
 * - FF (Finish-to-Finish): Predecessor must finish before successor finishes
 * - SF (Start-to-Finish): Predecessor must start before successor finishes
 */
export type LinkType = 'FS' | 'SS' | 'FF' | 'SF';

/**
 * Single dependency relationship (predecessor link)
 */
export interface TaskDependency {
  /** ID of the predecessor task */
  taskId: string;
  /** Type of link: FS (finish-to-start), SS, FF, SF */
  type: LinkType;
  /** Lag in days (positive or negative integer, default: 0) */
  lag?: number;
}

/**
 * Error or warning from dependency validation
 */
export interface DependencyError {
  /** Type of error */
  type: 'cycle' | 'constraint' | 'missing-task';
  /** ID of the task with the error */
  taskId: string;
  /** Human-readable error message */
  message: string;
  /** Related task IDs (e.g., cycle path, referenced tasks) */
  relatedTaskIds?: string[];
}

/**
 * Result of dependency validation
 */
export interface ValidationResult {
  /** True if no errors found */
  isValid: boolean;
  /** Array of errors/warnings (empty if valid) */
  errors: DependencyError[];
}

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
  /**
   * Optional progress value from 0-100
   * - Decimal values are allowed and rounded to nearest integer for display
   * - Values are clamped to 0-100 range
   * - Undefined or 0 means no progress is displayed
   * - Progress is visual-only, no user interaction
   */
  progress?: number;
  /**
   * Optional flag indicating if task is accepted
   * - Only meaningful when progress is 100%
   * - Affects the color of the progress bar (green for accepted, yellow for completed)
   */
  accepted?: boolean;
  /**
   * Optional array of predecessor dependencies
   * Each dependency specifies a predecessor task, link type, and optional lag
   */
  dependencies?: TaskDependency[];
  /**
   * Optional flag to prevent drag and resize interactions.
   * When true, the task bar cannot be moved or resized.
   * Independent of accepted/progress — consumer controls both separately.
   */
  locked?: boolean;
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

/**
 * Represents a month span in the calendar header
 */
export interface MonthSpan {
  /** First day of the month (UTC) */
  month: Date;
  /** Number of days this month spans in the visible range */
  days: number;
  /** Start index in the date range array */
  startIndex: number;
}

/**
 * Represents a vertical grid line
 */
export interface GridLine {
  /** X position in pixels */
  x: number;
  /** True if this line is at the start of a month */
  isMonthStart: boolean;
  /** True if this line is at the start of a week (Monday) */
  isWeekStart: boolean;
}

/**
 * Represents a weekend background block
 */
export interface WeekendBlock {
  /** Left position in pixels */
  left: number;
  /** Width in pixels */
  width: number;
}
