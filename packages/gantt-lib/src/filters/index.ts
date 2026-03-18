import { Task } from '../types';
import { parseUTCDate } from '../utils/dateUtils';

/**
 * Predicate function for filtering tasks
 * @param task - Task to evaluate
 * @returns true to include task in filtered results, false to exclude
 */
export type TaskPredicate = (task: Task) => boolean;

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
