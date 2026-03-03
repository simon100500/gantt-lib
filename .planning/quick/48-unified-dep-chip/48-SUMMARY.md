---
phase: quick-048
plan: 01
subsystem: task-list-deps
tags: [dep-chip, popover, css, hover, unified-component]
key-files:
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - "DepChip defined as file-local component (not separate file) to keep context minimal and avoid unnecessary module boundaries"
  - "TrashIcon extracted as micro helper to eliminate SVG duplication across cell and popover contexts"
  - "CSS :has() selector used for selected-state trash visibility — supported in all modern browsers, consistent with project's modern CSS approach"
  - "Trash button always rendered in DOM (not conditional JSX), hidden via CSS display:none — enables CSS :hover transition without JS state"
metrics:
  duration: "3 min"
  completed: "2026-03-03"
  tasks: 2
  files: 2
---

# Phase quick-048 Plan 01: Unified DepChip Component Summary

**One-liner:** Extracted a single `DepChip` local component used in both the 1-dep cell and the 2+-dep popover, with hover-to-show-trash and click-to-select behavior identical in both contexts.

## What Was Done

### Task 1 — Extract DepChip component (fa64cfe)

Defined a `DepChip` functional component inside `TaskListRow.tsx` (above the `TaskListRowProps` interface). The component:

- Receives `label`, `dep`, `taskId`, `selectedChip`, `disableDependencyEditing`, and all required callbacks as props
- Renders a `.gantt-tl-dep-chip-wrapper` containing:
  - A clickable chip `<span>` with `gantt-tl-dep-chip-selected` class when active — clicking toggles selection, calls `onChipSelect`, `onRowClick`, `onScrollToTask`
  - A trash `<button className="gantt-tl-dep-chip-trash">` — always rendered (not conditional), visibility controlled by CSS

Also added a `TrashIcon` helper component to avoid duplicating the SVG markup.

Updated TaskListRow JSX:
- **Single-chip path** (`chips.length === 1`): replaced the old `<span className="gantt-tl-dep-chip-wrapper">...</span>` block (with inline conditional trash) with `<DepChip />`
- **Popover path** (`chips.length >= 2`): replaced each `<div className="gantt-tl-dep-overflow-item">` (with non-interactive span + always-visible trash) with `<DepChip />` directly inside `.gantt-tl-dep-overflow-list`
- Removed the now-unused `handleChipClick` callback (its logic lives inside `DepChip`)

### Task 2 — CSS hover-based trash visibility (acb0533)

Changed `.gantt-tl-dep-chip-trash` from `display: inline-flex` (always visible) to `display: none` (hidden by default).

Added two show rules:
```css
/* Show on wrapper hover */
.gantt-tl-dep-chip-wrapper:hover .gantt-tl-dep-chip-trash {
  display: inline-flex;
}

/* Keep visible when chip is selected */
.gantt-tl-dep-chip-wrapper:has(.gantt-tl-dep-chip-selected) .gantt-tl-dep-chip-trash {
  display: inline-flex;
}
```

## Files Changed

| File | Change |
|------|--------|
| `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` | Added `TrashIcon`, `DepChipProps` interface, `DepChip` component; replaced chip JSX in both cell and popover paths |
| `packages/gantt-lib/src/components/TaskList/TaskList.css` | Hidden trash by default; show on hover and on selected-chip state |

## Commits

| Hash | Description |
|------|-------------|
| fa64cfe | feat(quick-048): extract DepChip component and unify chip rendering in cell and popover |
| acb0533 | feat(quick-048): CSS hover-based trash visibility on chip wrapper |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — modified (DepChip component added, JSX updated)
- `packages/gantt-lib/src/components/TaskList/TaskList.css` — modified (display:none + hover rules added)
- Commit fa64cfe exists
- Commit acb0533 exists
- `npm run build -w packages/gantt-lib` — passes with no TypeScript errors
