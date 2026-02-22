---
phase: 11-lock-task
plan: 02
title: "Locked tasks demo — human verification of lock interactions end-to-end"
one-liner: "Demo page with locked tasks (id 1, 4) for human verification of padlock icon, cursor feedback, drag prevention, and cascade behavior"
subsystem: "demo-verification"
tags: ["demo", "human-verification", "end-to-end"]

dependency_graph:
  requires:
    - "packages/gantt-lib/src/types/index.ts (Task.locked field)"
    - "packages/gantt-lib/src/hooks/useTaskDrag.ts (lock guard and cascade skip)"
    - "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx (lock icon rendering)"
  provides:
    - "Demo tasks with locked: true for visual verification"
    - "Human sign-off on lock behavior correctness"
  affects:
    - "packages/website/src/app/page.tsx (sample task data)"

tech_stack:
  added: []
  patterns:
    - "Demo page modification pattern (add locked: true to sample tasks)"
    - "Human verification checkpoint for visual/interactive features"

key_files:
  created: []
  modified:
    - "packages/website/src/app/page.tsx (+2 lines)"

decisions: []

metrics:
  duration: "4 min"
  completed_date: "2026-02-22"
  tasks_completed: 2
  commits: 1
  files_changed: 1
  lines_added: 2
---

# Phase 11 Plan 02: Locked tasks demo — human verification of lock interactions end-to-end Summary

## Overview

Added locked tasks to the website demo page so the human can visually verify that lock interactions work correctly end-to-end: icon display, cursor feedback, drag prevention, and cascade behavior with locked tasks in the chain.

Purpose: Human verification is required before marking this phase complete — the lock behavior is visual and interactive, not testable by TypeScript alone.

## Implementation Summary

### Demo Page Modification (Task 1)

**packages/website/src/app/page.tsx**

Modified the `createSampleTasks()` function to add `locked: true` to two tasks covering both test scenarios:

1. **Task id "1" ("Геодезическая разбивка площадки")** — locked standalone task (no dependencies from it)
   - Already has `progress: 100, accepted: true`
   - Canonical use case: a completed+accepted task that should not be rescheduled

2. **Task id "4" ("Разработка котлована")** — locked task that is a SUCCESSOR in a cascade chain
   - Has an FS dependency on task "2"
   - Tests that when task "2" is dragged, the cascade preview does NOT move task "4"

Most tasks left unlocked so the user can verify normal drag still works.

## Deviations from Plan

None — plan executed exactly as written.

## Human Verification Results

**User approval:** APPROVED

All 6 verification checks passed:

1. **Lock icon visible:** Tasks "Геодезическая разбивка площадки" and "Разработка котлована" show a small padlock icon on the left side of their task bars
2. **Cursor feedback:** Hovering over locked tasks shows `not-allowed` cursor; unlocked tasks show `grab` cursor
3. **Drag blocked:** Locked tasks cannot be dragged — interaction is completely blocked
4. **Resize blocked:** Locked tasks cannot be resized from left or right edges
5. **Unlocked tasks work normally:** Drag on unlocked tasks (e.g., task "2") works normally
6. **Cascade skips locked:** Dragging task "2" does not visually move locked task "4" during cascade preview

## Verification Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Task 1 has locked: true | ✅ | page.tsx line with `id: "1", locked: true` |
| Task 4 has locked: true | ✅ | page.tsx line with `id: "4", locked: true` |
| Dev server starts | ✅ | `npm run dev` completed successfully |
| Page renders without errors | ✅ | Page loads and Gantt chart displays |
| Human verified lock icon | ✅ | User approved checkpoint |
| Human verified cursor feedback | ✅ | User approved checkpoint |
| Human verified drag blocked | ✅ | User approved checkpoint |
| Human verified resize blocked | ✅ | User approved checkpoint |
| Human verified unlocked tasks work | ✅ | User approved checkpoint |
| Human verified cascade skip | ✅ | User approved checkpoint |

## Commits

| Commit | Hash | Description |
|--------|------|-------------|
| Task 1 | `28e1d15` | feat(11-02): add locked tasks to demo page for human verification |

## Phase 11 Completion Status

**Phase 11 (lock-task): COMPLETE**

Both plans completed:
- 11-01: Task lock feature implementation (81s, 5 files)
- 11-02: Locked tasks demo with human verification (4 min, 1 file)

**Total phase duration:** ~6 minutes
**Total files modified:** 6
**Total commits:** 3

All success criteria met:
- ✅ Padlock icon visible on locked tasks
- ✅ Cursor is not-allowed on hover
- ✅ Drag and resize are completely blocked
- ✅ Unlocked tasks still drag normally
- ✅ Cascade preview does not move locked successor tasks

## Self-Check: PASSED

- Modified file exists: packages/website/src/app/page.tsx
- Commit exists in git log: 28e1d15
- Human verification approved: user responded "approved"
- All plan success criteria met
