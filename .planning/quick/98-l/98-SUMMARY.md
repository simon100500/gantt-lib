---
phase: 98-l
plan: 98
subsystem: TaskList
tags: [ui, visual, hierarchy, svg, child-rows]
dependency_graph:
  requires: []
  provides: [VISUAL-HIERARCHY-INDICATOR]
  affects: [TaskListRow, TaskList.css]
tech_stack:
  added: []
  patterns: [inline-svg-component, conditional-render-isChild]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - "Hide connector during name editing (isChild && !editingName) to avoid overlap with input overlay"
  - "Position at left: 4px absolute within name cell — sits within existing 24px child indent space"
  - "Use currentColor with --gantt-grid-line-color CSS variable for subtle gray tint"
metrics:
  duration: "5 minutes"
  completed: "2026-03-15T14:24:27Z"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 2
---

# Phase 98 Plan 98: Visual Hierarchy Connector for Child Rows Summary

**One-liner:** L-shaped SVG tree connector rendered absolutely in child task name cells using currentColor and the existing 24px indent space.

## What Was Built

Added a `HierarchyConnectorIcon` inline SVG component that renders for child task rows in the `TaskListRow` name cell. The icon is an L-shaped path (vertical + horizontal line with a dot at the end) styled to match file-tree views. It appears only when `isChild && !editingName`, disappearing cleanly during name editing to avoid overlapping the Input overlay.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Add HierarchyConnector SVG and render for child rows | 98819cd | TaskListRow.tsx, TaskList.css |

## Key Files

**Modified:**
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — Added `HierarchyConnectorIcon` const component (lines 74-89); added `{isChild && !editingName && <HierarchyConnectorIcon />}` inside the name cell div
- `packages/gantt-lib/src/components/TaskList/TaskList.css` — Added `.gantt-tl-hierarchy-connector` rule: absolute positioned at `left: 4px`, `top: 50%`, 16x16px, color from `--gantt-grid-line-color`

## Decisions Made

1. **Hide during editing:** `isChild && !editingName` condition prevents visual conflict with the absolutely-positioned Input overlay that fills the full cell during name editing.
2. **Absolute positioning at left: 4px:** Fits cleanly within the pre-existing `padding-left: 24px` on `.gantt-tl-name-trigger-child`, no layout shift needed.
3. **currentColor with CSS variable fallback:** `color: var(--gantt-grid-line-color, #d1d5db)` gives users theme control and defaults to a neutral gray.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` - FOUND (modified)
- `packages/gantt-lib/src/components/TaskList/TaskList.css` - FOUND (modified)
- Commit 98819cd - FOUND
- Build: CJS + ESM + DTS all succeeded, no TypeScript errors
