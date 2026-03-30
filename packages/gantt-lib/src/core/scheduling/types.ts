/**
 * Core scheduling type re-exports.
 * This file is the type gateway into the core scheduling module.
 * Zero React/DOM/date-fns imports.
 */
import type {
  LinkType,
  TaskDependency,
  DependencyError,
  ValidationResult,
  Task,
} from '../../types';

export type {
  LinkType,
  TaskDependency,
  DependencyError,
  ValidationResult,
  Task,
}

/** Minimal task shape for scheduling operations */
export interface ScheduleTask {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  dependencies?: TaskDependency[];
  parentId?: string;
  locked?: boolean;
  progress?: number;
}

/** Dependency for scheduling operations */
export interface ScheduleDependency {
  type: LinkType;
  taskId: string;
  lag?: number;
}

/** Update for a single task (id + changed fields) */
export interface ScheduleTaskUpdate {
  id: string;
  startDate?: string;
  endDate?: string;
  dependencies?: TaskDependency[];
  progress?: number;
}

/** Result of executing a scheduling command */
export interface ScheduleCommandResult {
  /** All tasks that changed as a result of the command (including the source task) */
  changedTasks: Task[];
  /** IDs of changed tasks */
  changedIds: string[];
}

/** Options for scheduling commands */
export interface ScheduleCommandOptions {
  /** Account for business days during cascade */
  businessDays?: boolean;
  /** Weekend predicate function */
  weekendPredicate?: (date: Date) => boolean;
  /** Skip cascade, only recalculate the task itself */
  skipCascade?: boolean;
}
