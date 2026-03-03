---
phase: quick-045
plan: 01
subsystem: task-list
tags: [deps-cell, picker-mode, ux-feedback, placeholder]
key-files:
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - isSourceRow branch placed before isSelectedPredecessor check — source row hint takes highest priority in deps cell rendering
  - Removed opacity:0.4 from picker-self rule — placeholder provides purposeful visual context, dimming no longer needed
metrics:
  duration: "~4 min"
  completed: "2026-03-03"
  tasks: 1
  files: 2
---

# Phase quick-045 Plan 01: Show "Выберите задачу" in Source Row Deps Cell During Link Creation Summary

**One-liner:** Italic grey "Выберите задачу" placeholder replaces chips/add-button in the source row's deps cell while predecessor-picking mode is active.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Render "Выберите задачу" in source row deps cell during picking mode | cf5225e | TaskListRow.tsx, TaskList.css |

## What Was Built

When a user clicks the "+" button in any row's deps cell to enter link creation mode, that initiating row's deps cell now shows an italic grey "Выберите задачу" placeholder instead of the normal chips, overflow popover, or add button. All other rows continue to display their normal content and show the crosshair/picker-highlight style.

### Changes

**TaskListRow.tsx** — Added `isSourceRow` branch as the first check in the deps cell JSX ternary chain:
```tsx
{isSourceRow ? (
  <span className="gantt-tl-dep-source-hint">Выберите задачу</span>
) : isSelectedPredecessor && !disableDependencyEditing ? (
  /* existing delete label button */
) : (
  /* existing chips + overflow + add button */
)}
```

**TaskList.css** — Added `.gantt-tl-dep-source-hint` CSS rule and removed `opacity: 0.4` from `.gantt-tl-row-picking-self .gantt-tl-cell-deps` (kept `cursor: not-allowed`).

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` modified with isSourceRow branch
- [x] `packages/gantt-lib/src/components/TaskList/TaskList.css` updated with `.gantt-tl-dep-source-hint` rule and removed `opacity: 0.4`
- [x] Commit cf5225e exists with both files
- [x] TypeScript: no new errors introduced (pre-existing errors in test file and DragGuideLines export are unrelated)
