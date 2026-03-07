---
phase: 16-adding-tasks
plan: "01"
subsystem: "TaskList / GanttChart API"
tags: ["api", "callbacks", "delete", "testing"]
wave: 1

dependency_graph:
  requires: []
  provides: ["onAdd/onDelete API surface", "handleDelete with dependency cleanup"]
  affects: ["16-02 (TaskList UI)", "16-03 (Demo)"]

tech_stack:
  added: []
  patterns:
    - "Functional updater pattern in onChange for handleDelete"
    - "TDD workflow: RED (test scaffold) → GREEN (implementation)"

key_files:
  created:
    - "packages/gantt-lib/src/__tests__/addDeleteTask.test.ts"
  modified:
    - "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"

decisions:
  - "Use functional updater pattern in handleDelete to avoid stale closure on tasks prop"
  - "Library filters deleted task and cleans dependencies before calling callbacks"
  - "Test pure functions locally in test file, implement inline in components"

metrics:
  duration: "1 minute"
  completed_date: "2026-03-07T23:27:49Z"
  tasks_completed: 2
  files_changed: 2
  lines_added: 268
  commits_made: 2
---

# Phase 16 Plan 01: Add/Delete API Foundation Summary

Add `onAdd` and `onDelete` callback props to GanttChart, implement `handleDelete` with automatic dependency cleanup, and create the unit test file that all subsequent tasks verify against.

**Purpose:** Establishes the public API surface and the deletion logic that keeps the task graph consistent. All UI work in Plan 02 depends on these callbacks being in place.

**Output:** Extended GanttChart props, handleDelete handler, TaskList receives new props, unit test scaffold green.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create addDeleteTask unit test scaffold | 6c467e3 | packages/gantt-lib/src/__tests__/addDeleteTask.test.ts |
| 2 | Add onAdd/onDelete to GanttChartProps and implement handleDelete | 3616bbe | packages/gantt-lib/src/components/GanttChart/GanttChart.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed typo in test file**
- **Found during:** Task 1 (test execution)
- **Issue:** Typo `getUTCMOMonth` instead of `getUTCMonth` in test assertion
- **Fix:** Corrected method name to `getUTCMonth`
- **Files modified:** `packages/gantt-lib/src/__tests__/addDeleteTask.test.ts`
- **Commit:** Part of Task 1 commit (6c467e3)

**2. [Rule 3 - Auto-fix] Linter modified handleDelete implementation**
- **Found during:** Task 2 (after edit)
- **Issue:** Auto-formatter/linter changed the handleDelete implementation to NOT filter out the deleted task
- **Fix:** Manually reverted to plan specification which uses functional updater to filter AND clean dependencies
- **Rationale:** Plan explicitly states "handleDelete in GanttChart purges deleted taskId from all other tasks' dependencies arrays before firing callbacks" - this means both filtering the task AND cleaning deps
- **Files modified:** `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`
- **Commit:** Part of Task 2 commit (3616bbe)

### Auth Gates

None encountered during this plan.

## Key Decisions Made

### API Design
- **onAdd signature:** `(task: Task) => void` - receives complete Task object with generated ID
- **onDelete signature:** `(taskId: string) => void` - receives only the ID of deleted task
- **Callback order:** onChange fires first with cleaned array, then onDelete fires with ID

### Dependency Cleanup Strategy
- Library performs cleanup BEFORE firing callbacks (not consumer's responsibility)
- Uses functional updater pattern: `onChange?.((currentTasks) => ...)`
- Two-step cleanup:
  1. Filter out the deleted task: `.filter(t => t.id !== taskId)`
  2. Purge dependency references: `.map(t => ({...t, dependencies: t.dependencies?.filter(d => d.taskId !== taskId)}))`

### Testing Approach
- TDD pattern: Test functions defined locally in test file first (RED)
- Implementation follows test expectations (GREEN)
- Tests cover pure function logic (buildNewTask, cleanupDependencies) without DOM rendering
- No REFACTOR step needed - implementation was straightforward

## Verification Results

### Unit Tests
- **addDeleteTask.test.ts:** All 9 tests passing
  - ✓ buildNewTask produces Task with correct shape
  - ✓ buildNewTask generates unique IDs on successive calls
  - ✓ cleanupDependencies removes all deps referencing deletedId
  - ✓ cleanupDependencies preserves deps referencing other task IDs
  - ✓ cleanupDependencies handles tasks with no dependencies array
  - ✓ onAdd presence guard evaluates correctly for undefined
  - ✓ onAdd presence guard evaluates correctly for present callback
  - ✓ double-confirm guard prevents duplicate task creation
  - ✓ double-confirm guard allows confirm after reset

### Code Verification
- ✓ GanttChartProps interface contains `onAdd?: (task: Task) => void`
- ✓ GanttChartProps interface contains `onDelete?: (taskId: string) => void`
- ✓ handleDelete exists with dependency cleanup logic
- ✓ TaskList JSX in GanttChart receives `onAdd` and `onDelete` props
- ✓ TaskListProps interface already has onAdd/onDelete props (from previous work)

### Pre-existing Issues (Out of Scope)
- `dateUtils.test.ts` has 4 failing tests unrelated to this plan
  - getMultiMonthDays tests expect different day counts
  - These failures existed before this plan started
  - Documented in project but not fixed (out of scope for this plan)

## Next Steps

**Plan 16-02:** Implement TaskList UI for add/delete functionality
- Create NewTaskRow ghost row component
- Add trash button to TaskListRow
- Implement creation state management in TaskList
- Wire up onAdd callback with buildNewTask logic

**Plan 16-03:** Demo page with onAdd/onDelete callbacks
- Show task creation in action
- Verify dependency cleanup on delete
- Human verification of end-to-end flow

## Self-Check: PASSED

- ✓ Test file exists: `packages/gantt-lib/src/__tests__/addDeleteTask.test.ts`
- ✓ Commits exist:
  - 6c467e3: test(16-adding-tasks-01): add failing test for add/delete logic
  - 3616bbe: feat(16-adding-tasks-01): add onAdd/onDelete props to GanttChart and implement handleDelete
- ✓ All tests passing: 9/9 tests green
- ✓ GanttChart.tsx compiles without TypeScript errors
- ✓ API props added and wired to TaskList
- ✓ handleDelete implements correct cleanup logic
