// Backward compatibility — all scheduling logic moved to src/core/scheduling
// This file re-exports everything so existing imports continue to work.
// Note: getBusinessDaysCount, addBusinessDays, subtractBusinessDays are
// excluded here because dateUtils.ts exports wrapper versions with string
// return types (backward compat). The core versions return Date objects.
export {
  // types
  type LinkType,
  type TaskDependency,
  type DependencyError,
  type ValidationResult,
  type Task,

  // dateMath
  normalizeUTCDate,
  parseDateOnly,
  getBusinessDayOffset,
  shiftBusinessDayOffset,
  alignToWorkingDay,
  getTaskDuration,
  DAY_MS,

  // dependencies
  getDependencyLag,
  normalizeDependencyLag,
  calculateSuccessorDate,
  computeLagFromDates,

  // cascade
  cascadeByLinks,
  universalCascade,
  getSuccessorChain,
  getTransitiveCascadeChain,
  reflowTasksOnModeSwitch,

  // commands
  buildTaskRangeFromStart,
  buildTaskRangeFromEnd,
  moveTaskRange,
  clampTaskRangeForIncomingFS,
  recalculateIncomingLags,

  // validation
  buildAdjacencyList,
  detectCycles,
  validateDependencies,

  // hierarchy
  getChildren,
  isTaskParent,
  computeParentDates,
  computeParentProgress,
  getAllDescendants,
  getAllDependencyEdges,
  removeDependenciesBetweenTasks,
  findParentId,
  isAncestorTask,
  areTasksHierarchicallyRelated,

  // execute (command-level API)
  moveTaskWithCascade,
  resizeTaskWithCascade,
  recalculateTaskFromDependencies,
  recalculateProjectSchedule,

  // backward-compat UI adapter re-exports
  resolveDateRangeFromPixels,
  clampDateRangeForIncomingFS,
} from '../core/scheduling';
