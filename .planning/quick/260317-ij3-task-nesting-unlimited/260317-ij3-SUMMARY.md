---
phase: quick-260317-ij3
plan: 01
subsystem: TaskList / GanttChart
tags: [hierarchy, nesting, ui, drag-drop, indentation]
dependency_graph:
  requires: []
  provides: [unlimited-task-nesting, depth-based-indentation]
  affects: [TaskListRow, TaskList, GanttChart]
tech_stack:
  added: []
  patterns: [inline-style-depth-indentation, recursive-depth-map]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
decisions:
  - Removed !isParent guard from canDemote so parent tasks with children can be demoted into deeper hierarchy
  - Fixed handlePromoteTask to move task to grandparent level (not always to root) for correct one-level-up semantics
  - Replaced CSS class-based fixed indentation (24px/26px) with inline paddingLeft computed as nestingDepth * 20px + base
  - Removed Scenario 2 from isValidParentDrop to allow dragging parent tasks into nested positions (Scenarios 1 and 3 still prevent cycles)
  - nestingDepth computed in TaskList via useMemo with recursive depth resolution, passed as prop to each TaskListRow
metrics:
  duration: 5min
  completed: 2026-03-17T10:33:00Z
  tasks_completed: 2
  files_modified: 3
---

# Phase quick-260317-ij3 Plan 01: Task Nesting Unlimited Summary

**One-liner:** Removed 2-level nesting cap by relaxing canDemote guard, fixing promote-to-grandparent logic, allowing parent drag-drop into nested positions, and adding 20px-per-level inline indentation driven by a recursive nestingDepthMap.

## What Was Done

Lifted all artificial restrictions that prevented tasks from nesting beyond 2 levels:

1. **Demote any task** — The `!isParent` guard in `HierarchyButton.canDemote` was removed. Parent tasks (those with children) can now be demoted, becoming children of the task above them.

2. **Promote to grandparent** — `handlePromoteTask` in `GanttChart.tsx` previously always set `parentId: undefined` (root). It now looks up the current parent's own parentId (grandparent) and promotes one level at a time, preserving intermediate hierarchy levels.

3. **Drag-drop into nested positions** — `isValidParentDrop` Scenario 2 (which blocked dropping parent tasks when the drop target had a parentId) was removed. Scenarios 1 (no dropping into own children) and 3 (no dropping under own descendants) remain to prevent cycles.

4. **Visual depth indentation** — `TaskList` computes a `nestingDepthMap` via `useMemo` with a recursive `getDepth()` function. Each `TaskListRow` receives a `nestingDepth` prop (0 = root, 1 = child, etc.) and applies:
   - `paddingLeft: nestingDepth * 20 + base` on the name trigger button and input
   - `left: nestingDepth * 20 + 4px` on the collapse button
   - `left: (nestingDepth - 1) * 20 + 4px` on the connector icon span

5. **Tooltip update** — Promote button tooltip changed from "Повысить (сделать корневой)" to "Повысить уровень" since it no longer always goes to root.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 411c891 | feat: remove nesting depth restrictions (demote, promote, drag-drop) |
| 2    | 43285c3 | feat: add depth-based visual indentation for unlimited nesting |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- 29/29 tests pass across hierarchy.test.ts and cascadeDeleteAndMultiLevelCollapse.test.ts
- No TypeScript errors in modified files
- Existing getTaskNumber function already supports unlimited depth numbering (1.1.1.1...)
- Existing flattenHierarchy already handles arbitrary depth ordering

## Self-Check: PASSED

- [x] D:\Проекты\gantt-lib\packages\gantt-lib\src\components\TaskList\TaskListRow.tsx - modified
- [x] D:\Проекты\gantt-lib\packages\gantt-lib\src\components\TaskList\TaskList.tsx - modified
- [x] D:\Проекты\gantt-lib\packages\gantt-lib\src\components\GanttChart\GanttChart.tsx - modified
- [x] commit 411c891 exists
- [x] commit 43285c3 exists
