---
phase: quick-31
plan: 31
subsystem: task-list
tags: [ux, css, input, cursor, padding]
dependency_graph:
  requires: []
  provides: [compact-name-cell, wide-name-input, correct-cursor-positioning]
  affects: [TaskList.css, TaskListRow.tsx]
tech_stack:
  added: []
  patterns: [visibility-hidden-for-click-passthrough]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.css
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
decisions:
  - "Hide span with visibility:hidden+pointerEvents:none when editing — lets clicks reach absolute-positioned input for correct cursor placement"
  - "Remove select() from useEffect focus handler — only focus(), letting browser position cursor at click coordinates"
metrics:
  duration: "48 seconds"
  completed: "2026-02-28"
---

# Phase quick-31 Plan 31: Task Name Input UX Improvements Summary

**One-liner:** Compact name cell (2px padding), wider input overlay (320px min-width), and click-accurate cursor positioning via span hide-on-edit pattern.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Reduce name cell padding and widen input | b9ee2b8 | TaskList.css |
| 2 | Fix cursor positioning in name input | bd3ed56 | TaskListRow.tsx |

## What Was Built

### Task 1: CSS — Compact Rows and Wider Input

In `TaskList.css`:

- `.gantt-tl-cell-name`: `padding-top/bottom` reduced from `6px` to `2px` — rows are more compact
- `.gantt-tl-cell-name`: `align-items` changed from `flex-start` to `center` — better vertical alignment with smaller padding
- `.gantt-tl-name-input`: `min-width` increased from `200px` to `320px` — input extends beyond the name column's flex width, providing a wider editing area

The cell already had `overflow: visible` and the input `position: absolute` + `z-index: 100`, so no additional overflow changes were needed.

### Task 2: Correct Cursor Positioning in Input

In `TaskListRow.tsx`:

**Problem:** When the name input was open and the user clicked inside it, the underlying `<span>` with `onClick={handleNameClick}` was still receiving clicks (because `position: absolute` on input doesn't prevent DOM siblings from receiving pointer events in their natural position). This caused `handleNameClick` to fire, which then called `setEditingName(true)` and `setNameValue(...)`, potentially causing re-renders that reset cursor position.

Additionally, the `useEffect` was calling `nameInputRef.current.select()` every time `editingName` changed — while `editingName` only changes once (false -> true), removing `select()` lets the browser honor the natural click position on the span-to-input transition.

**Fix applied:**
1. Removed `select()` from useEffect — now only calls `focus()`
2. Added `style={editingName ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}` to the span

With `visibility: hidden`, the span occupies its layout space (preventing layout shift) but does not receive pointer events. Clicks go directly to the absolute-positioned input, which lets the browser position the cursor at the exact click coordinates.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

Build: `npm run build --workspace=packages/gantt-lib` — success (CJS + ESM + DTS in 1.1s)

Visual verification (browser):
- Task list rows are more compact (2px vertical padding vs 6px)
- Name input at minimum 320px wide, extending past the column boundary
- Click anywhere in the active input positions cursor at that location (no select-all)

## Self-Check: PASSED

- FOUND: packages/gantt-lib/src/components/TaskList/TaskList.css
- FOUND: packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
- FOUND commit: b9ee2b8 (Task 1 - CSS changes)
- FOUND commit: bd3ed56 (Task 2 - cursor fix)
