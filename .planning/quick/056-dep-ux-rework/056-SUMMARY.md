---
phase: quick-056
plan: 01
subsystem: dependency-ux
tags: [dependency-lines, task-list, popover, chip, highlight, ux]
dependency_graph:
  requires: [DependencyLines.tsx, TaskListRow.tsx, TaskList.css, DependencyLines.css]
  provides: [click-to-highlight line, chip description popover]
  affects: [DependencyLines, TaskListRow, DepChip]
tech_stack:
  added: []
  patterns: [local-popover-state, isHighlighted-composition, formatDepDescription-duplication]
key_files:
  modified:
    - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - "Keep formatDepDescription duplicated in TaskListRow rather than extracting to shared util — avoids build-order coupling"
  - "isHighlighted = isSelected || isClickedEdge — chip-select and line-click both produce red highlight without conflict"
  - "PopoverTrigger asChild wraps chip span — preserves existing chip DOM structure and CSS class application"
  - "Popover open state is local to DepChip — avoids lifting state to parent, self-contained toggle"
metrics:
  duration: "~2 minutes"
  completed: "2026-03-03"
  tasks: 2
  files_modified: 3
---

# Phase quick-056 Plan 01: Dep UX Rework Summary

**One-liner:** Reworked dependency UX — SVG line click highlights red (no popover); dep chip click opens popover with Russian human-readable description (e.g. "Сразу после окончания «Название»").

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove popover from DependencyLines — keep click-to-highlight only | `0bb7816` | DependencyLines.tsx |
| 2 | Chip click popover with human-readable dependency description in TaskListRow | `d00a550` | TaskListRow.tsx, TaskList.css |

## What Was Built

### Task 1 — DependencyLines: click-to-highlight, no popover

- Removed `popoverPos` state and setter
- Removed `useEffect` (outside-click handler) and the now-unused `useEffect` import
- Introduced `isHighlighted = isSelected || isClickedEdge` to unify chip-select and line-click visual state
- Applied `isHighlighted` to `pathClassName`, `markerEnd`, and `lagColor` (replaces `isSelected` in all three places)
- Stripped `setPopoverPos` calls from the hit-area `onClick` — toggle is now pure: set/clear `clickedEdge`
- Removed the entire popover JSX block (`<div className="gantt-dep-popover">...</div>`)
- CSS classes `.gantt-dep-popover`, `.gantt-dep-popover-title`, `.gantt-dep-popover-desc` retained in DependencyLines.css (reused by TaskListRow chip popover)

### Task 2 — TaskListRow DepChip: click opens description popover

- Added `pluralDays` and `formatDepDescription` helper functions (duplicated from DependencyLines.tsx — same logic, all 4 link types × lag variants)
- Added local `popoverOpen` state to `DepChip`
- Updated `handleClick`:
  - In read-only mode (`disableDependencyEditing`): toggles popover only
  - In edit mode: selects chip + opens popover on select, closes on deselect
- Wrapped return with `<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>`
- `PopoverTrigger asChild` wraps the inner chip `<span>` — trash button stays outside trigger but inside wrapper
- `PopoverContent portal={true} align="start" side="bottom" className="gantt-tl-dep-desc-popover"` renders description text
- Added `.gantt-tl-dep-desc-popover` CSS in TaskList.css (padding, font-size, color, max/min-width)

## Verification

Build passes (ESM + CJS + DTS) with no TypeScript errors.

Expected runtime behavior:
- Clicking a dependency line in the Gantt grid turns it red (no popover appears); clicking again deselects
- Clicking a dep chip opens a popover below it with correct Russian phrase for all 4 types and lag variants
- Popover closes on outside click (via `onOpenChange` from Radix Popover)
- Chip-select red arrow still fires when chip is clicked in edit mode

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx` modified
- [x] `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` modified
- [x] `packages/gantt-lib/src/components/TaskList/TaskList.css` modified
- [x] Commit `0bb7816` exists (Task 1)
- [x] Commit `d00a550` exists (Task 2)
- [x] Build passes: ESM + CJS + DTS success

## Self-Check: PASSED
