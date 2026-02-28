---
phase: quick-32
plan: 32
subsystem: task-list
tags: [ux, click-target, name-cell, button, css]
dependency_graph:
  requires: [quick-30]
  provides: [full-cell-name-click-target]
  affects: [TaskListRow, TaskList.css]
tech_stack:
  added: []
  patterns: [full-cell-button-trigger, onBlur-save]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - "Replace span with button for name trigger — matches date cell pattern from quick-30 and gives correct full-cell hit target"
  - "padding: 0 on .gantt-tl-cell-name, visual padding restored inside .gantt-tl-name-trigger — same technique as .gantt-tl-cell-date"
  - "onBlur={handleNameSave} unchanged — standard browser blur fires when clicking anywhere outside input"
metrics:
  duration: "3 min"
  completed: "2026-02-28"
  tasks: 1
  files: 2
---

# Quick-32 Summary: Name Cell Full-Cell Click Target (Like Date Cell)

**One-liner:** Replaced name cell span with full-cell `<button>` that fills the entire cell edge-to-edge, matching the date cell pattern from quick-30, so clicking anywhere in the name cell area (including padding zones) enters edit mode.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Replace span with full-cell button trigger and fix CSS padding | 20b13b9 | TaskListRow.tsx, TaskList.css |

## What Was Built

### TaskListRow.tsx
- Replaced `<span className="gantt-tl-cellContent" onClick={handleNameClick}>` with `<button type="button" className="gantt-tl-name-trigger" onClick={handleNameClick}>`
- Same hide-when-editing pattern preserved: `style={editingName ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}`
- `Input onBlur={handleNameSave}` unchanged — clicking outside the input fires blur and saves

### TaskList.css
- Updated `.gantt-tl-cell-name`: changed `padding-top: 2px; padding-bottom: 2px` to `padding: 0` so button fills edge-to-edge
- Added `.gantt-tl-name-trigger`: `width: 100%; height: 100%; padding: 4px 0.5rem` (visual padding restored inside button), `font-family: inherit`, `cursor: text`, `text-align: left`, `word-break: break-word`
- Added `.gantt-tl-name-trigger:hover`: blue tint `rgba(59, 130, 246, 0.1)` feedback
- Removed `.gantt-tl-cellContent` and `.gantt-tl-cellContent:hover` rules (no longer used)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — contains `gantt-tl-name-trigger` button
- `packages/gantt-lib/src/components/TaskList/TaskList.css` — contains `.gantt-tl-name-trigger` rule with `width: 100%; height: 100%`
- `.gantt-tl-cell-name` has `padding: 0`
- `Input onBlur={handleNameSave}` preserved
- Commit 20b13b9 exists
- Build: SUCCESS (tsup CJS + ESM + DTS)
