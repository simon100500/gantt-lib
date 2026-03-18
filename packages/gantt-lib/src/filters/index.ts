import { Task } from '../types';
import { parseUTCDate } from '../utils/dateUtils';
import { isTaskExpired } from '../utils/expired';

/**
 * Predicate function for filtering tasks
 * @param task - Task to evaluate
 * @returns true to include task in filtered results, false to exclude
 */
export type TaskPredicate = (task: Task | undefined) => boolean;

/**
 * Combine predicates with AND logic — all must be true
 * @param predicates - Array of predicate functions
 * @returns Composite predicate that returns true only if all predicates return true
 */
export const and = (...predicates: TaskPredicate[]): TaskPredicate =>
  (task) => predicates.every(p => p(task));

/**
 * Combine predicates with OR logic — at least one must be true
 * @param predicates - Array of predicate functions
 * @returns Composite predicate that returns true if any predicate returns true
 */
export const or = (...predicates: TaskPredicate[]): TaskPredicate =>
  (task) => predicates.some(p => p(task));

/**
 * Invert a predicate's logic
 * @param predicate - Predicate function to invert
 * @returns Composite predicate that returns the opposite of the input predicate
 */
export const not = (predicate: TaskPredicate): TaskPredicate =>
  (task) => !predicate(task);

/**
 * Filter tasks that have no dependencies
 * @returns Predicate that returns true for tasks without dependencies array or with empty array
 */
export const withoutDeps = (): TaskPredicate =>
  (task) => !!task && (!task.dependencies || task.dependencies.length === 0);

/**
 * Filter expired (overdue) tasks
 * @param referenceDate - Date to compare against (default: now)
 * @returns Predicate that returns true for tasks ending before reference date
 */
export const expired = (referenceDate: Date = new Date()): TaskPredicate =>
  (task) => isTaskExpired(task, referenceDate);

/**
 * Filter tasks that intersect with a date range
 * Task intersects if: taskStart <= rangeEnd && taskEnd >= rangeStart
 * @param rangeStart - Start of the date range
 * @param rangeEnd - End of the date range
 * @returns Predicate that returns true for tasks intersecting the range
 */
export const inDateRange = (rangeStart: Date, rangeEnd: Date): TaskPredicate =>
  (task) => {
    if (!task) return false;
    const taskStart = parseUTCDate(task.startDate);
    const taskEnd = parseUTCDate(task.endDate);
    return taskStart.getTime() <= rangeEnd.getTime() && taskEnd.getTime() >= rangeStart.getTime();
  };

/**
 * Filter tasks by progress value range
 * @param min - Minimum progress value (0-100)
 * @param max - Maximum progress value (0-100)
 * @returns Predicate that returns true for tasks with progress in [min, max] range
 */
export const progressInRange = (min: number, max: number): TaskPredicate =>
  (task) => {
    if (!task) return false;
    const progress = task.progress ?? 0;
    return progress >= min && progress <= max;
  };

/**
 * Filter tasks by name substring search
 * @param substring - Text to search for in task name
 * @param caseSensitive - If false (default), search is case-insensitive
 * @returns Predicate that returns true for tasks with substring in name
 */
export const nameContains = (substring: string, caseSensitive = false): TaskPredicate =>
  (task) => {
    if (!task) return false;
    const name = task.name;
    const search = caseSensitive ? substring : substring.toLowerCase();
    const target = caseSensitive ? name : name.toLowerCase();
    return target.includes(search);
  };
