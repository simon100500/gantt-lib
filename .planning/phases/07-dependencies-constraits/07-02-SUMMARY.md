---
phase: 07-dependencies-constraits
plan: 02
subsystem: ui
tags: [react, typescript, gantt, dependency, cascade, override, memo]

# Dependency graph
requires:
  - phase: 07-01
    provides: getSuccessorChain BFS, useTaskDrag cascade engine with onCascadeProgress/onCascade, updatedDependencies in onDragEnd

provides:
  - GanttChart cascadeOverrides state and handleCascadeProgress callback
  - GanttChart onCascade prop and handleCascade that merges shifted tasks via onChange
  - TaskRow overridePosition prop with arePropsEqual comparison
  - TaskRow passes onCascadeProgress and onCascade through to useTaskDrag
  - TaskRow handleDragEnd spreads updatedDependencies (soft-mode lag delivery)
  - Demo page cascade section: A->B->C FS chain showing real-time cascade

affects:
  - 07-03 (human verification of cascade drag behavior end-to-end)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cascadeOverrides Map state in GanttChart — new Map() on each update forces re-render detection"
    - "overridePosition prop takes priority over both drag state and static position via ??"
    - "arePropsEqual includes overridePosition comparison — critical for chain tasks to re-render during cascade"
    - "handleCascade uses functional onChange updater to merge cascaded tasks without stale closure"

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/website/src/app/page.tsx

key-decisions:
  - "overridePosition takes priority via ?? operator: overridePosition?.left ?? (isDragging ? currentLeft : left)"
  - "arePropsEqual compares overridePosition.left and .width separately — allows React.memo to detect cascade updates"
  - "onCascadeProgress and onCascade excluded from arePropsEqual (same pattern as onChange — GanttChart wraps in useCallback)"
  - "handleCascade in GanttChart calls both onChange (functional updater) and onCascade — state update is internal, external prop is notification-only"
  - "Demo containerHeight=250 for compact cascade section with 4 tasks"

requirements-completed: [PHASE7-WIRING]

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 7 Plan 02: Cascade Wiring (GanttChart + TaskRow + Demo) Summary

**GanttChart cascade state + handleCascadeProgress + TaskRow overridePosition wiring that makes non-dragged FS successor bars visually move during drag**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-21T21:38:15Z
- **Completed:** 2026-02-21T21:41:58Z
- **Tasks:** 2 of 3 (Task 3 is checkpoint:human-verify — awaiting manual verification)
- **Files modified:** 3

## Accomplishments

- `TaskRowProps` extended with `overridePosition?: { left; width }`, `onCascadeProgress?`, `onCascade?`
- `arePropsEqual` updated to compare `overridePosition.left` and `.width` — without this, chain tasks never re-render during drag (RESEARCH.md Pitfall 3)
- Render logic updated: `overridePosition?.left ?? (isDragging ? currentLeft : left)` — override takes highest priority
- `handleDragEnd` spreads `updatedDependencies` for soft-mode lag recalculation
- `GanttChartProps` extended with `onCascade?: (tasks: Task[]) => void`
- `cascadeOverrides: Map<string, {left, width}>` state added to GanttChart
- `handleCascadeProgress` callback added — calls `setCascadeOverrides(new Map(overrides))` each RAF
- `handleCascade` callback added — merges cascaded tasks into state via functional onChange updater, then calls `onCascade`
- `tasks.map()` in GanttChart now passes `overridePosition`, `onCascadeProgress`, `onCascade` to each TaskRow
- Demo page adds "Каскадное смещение (Phase 7)" section with 4-task cascade demo (A->B->C chain + independent D)
- Full monorepo build passes (gantt-lib + website Next.js)
- All 117 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add overridePosition to TaskRow** - `07ebec2` (feat)
2. **Task 2: Add cascade state and onCascade prop to GanttChart, update demo page** - `011bfb4` (feat)

**Task 3:** checkpoint:human-verify — awaiting manual drag verification

## Files Created/Modified

- `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx` — overridePosition prop, arePropsEqual comparison, render logic, handleDragEnd updatedDependencies, onCascadeProgress/onCascade passthrough
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` — cascadeOverrides state, handleCascadeProgress, handleCascade, onCascade prop, TaskRow render updated
- `packages/website/src/app/page.tsx` — cascade demo section with createCascadeTasks(), cascadeTasks state, handleCascadeChange, GanttChart with onCascade logging

## Decisions Made

- **overridePosition uses nullish coalescing priority:** `overridePosition?.left ?? (isDragging ? currentLeft : left)` — cascade override beats both drag and static position.
- **arePropsEqual compares overridePosition separately:** Comparing `.left` and `.width` independently (not object reference) avoids false negatives. Critical for React.memo re-render on cascade.
- **handleCascade uses functional onChange updater:** `onChange?.((currentTasks) => { ... })` avoids stale closure. Same pattern as handleTaskChange.
- **Demo containerHeight=250:** Compact section height for 4-task cascade demo — shows all tasks without scrolling.

## Deviations from Plan

None - plan executed exactly as written.

## Checkpoint: Awaiting Human Verification

Task 3 is `type="checkpoint:human-verify"`. The cascade system is wired but real-time drag behavior requires manual browser testing. See checkpoint details below for verification steps.

## Self-Check: PASSED

Files exist:
- FOUND: packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
- FOUND: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
- FOUND: packages/website/src/app/page.tsx

Commits exist:
- FOUND: 07ebec2 (Task 1)
- FOUND: 011bfb4 (Task 2)

Build: PASSED (gantt-lib + website, zero errors)
Tests: PASSED (117/117)
