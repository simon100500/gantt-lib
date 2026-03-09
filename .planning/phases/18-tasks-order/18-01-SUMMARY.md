---
phase: 18-tasks-order
plan: 01
subsystem: drag-to-reorder
tags: [tdd, api-surface, reorder-logic]
dependency_graph:
  requires: []
  provides: [reorder-tests, onReorder-API]
  affects: [GanttChart, TaskList]
tech_stack:
  added: []
  patterns: [pure-function-testing, callback-threading]
key_files:
  created:
    - packages/gantt-lib/src/__tests__/reorderTasks.test.ts
  modified:
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
decisions: []
metrics:
  duration: "2 min"
  completed_date: "2026-03-09"
---

# Phase 18 Plan 01: Reorder API Foundation Summary

**One-liner:** TDD implementation of reorderTasks pure function with 7 test cases, plus onReorder callback threading through GanttChart→TaskList.

## Overview

Plan 01 established the type contract and tested reorder logic that Plan 02 builds the drag UI against. The pure function `reorderTasks` makes the array splice logic testable in isolation before any DOM events are wired up.

## Completed Tasks

### Task 1: reorderTests Unit Tests (RED → GREEN)

**File:** `packages/gantt-lib/src/__tests__/reorderTasks.test.ts`

**What was done:**
- Created reorderTasks.test.ts with 7 test cases
- Implemented reorderTasks pure function inline in test file
- All tests passing (7/7 green)

**Test coverage:**
- REORDER-01: Move first to last (0→2)
- REORDER-01b: Move last to first (2→0)
- REORDER-02: No-op when from===to
- REORDER-02b: Immutability verification
- REORDER-03: Boundary: first→last with 2 tasks
- REORDER-03b: Boundary: last→first with 4 tasks
- Additional: Middle-to-middle reorder

**Implementation:**
```typescript
function reorderTasks(tasks: Task[], fromIndex: number, toIndex: number): Task[] {
  if (fromIndex === toIndex) return tasks;
  const result = [...tasks];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}
```

### Task 2: Wire onReorder Through GanttChart

**File:** `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`

**What was done:**
- Added `onReorder?: (tasks: Task[]) => void` to GanttChartProps interface (line 117)
- Destructured onReorder prop in component function signature (line 163)
- Implemented handleReorder callback (lines 407-410):
  ```typescript
  const handleReorder = useCallback((reorderedTasks: Task[]) => {
    onChange?.(reorderedTasks);
    onReorder?.(reorderedTasks);
  }, [onChange, onReorder]);
  ```
- Passed onReorder={handleReorder} to TaskList (line 536)

**TaskList.tsx stub:**
- Added `onReorder?: (tasks: Task[]) => void` to TaskListProps interface (line 49)
- Destructured onReorder prop (line 76)
- Implementation deferred to Plan 02 (drag UI logic)

## Deviations from Plan

None - plan executed exactly as written.

## Verification

**Automated tests:**
- reorderTasks tests: 7/7 passing
- Full test suite: 169/173 passing (4 pre-existing failures in dateUtils.test.ts, unrelated to changes)

**TypeScript:**
- Pre-existing errors in useTaskDrag.test.ts and DragGuideLines export
- No new errors introduced by onReorder changes

## Next Steps

Plan 02 will implement the full drag-and-drop UI in TaskList and TaskListRow, using the same reorder splice logic from Task 1's inline function.

## Self-Check: PASSED

- ✓ reorderTasks.test.ts exists with 7 test cases
- ✓ GanttChartProps includes onReorder prop
- ✓ handleReorder callback calls onChange then onReorder
- ✓ TaskList receives onReorder prop (stub implementation)
- ✓ No regressions in existing tests related to changes
