---
phase: quick-055
plan: 01
subsystem: task-list/dep-chips
tags: [popover, dependency, ux, russian-locale]
dependency_graph:
  requires: [TaskListRow.tsx, TaskList.css, Popover UI component]
  provides: [formatDepDescription helper, DepChip with Popover, .gantt-tl-dep-info-popover CSS]
  affects: [TaskListRow, DepChip, TaskList visuals]
tech_stack:
  added: []
  patterns: [controlled Radix Popover with open=isSelected, pure helper function for locale formatting]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions:
  - Popover root wraps entire DepChip return; wrapper span sits inside Popover but outside Trigger (valid Radix structure)
  - FS and FF both use "окончания" (end-based); SS and SF both use "начала" (start-based)
  - onOpenChange calls onChipSelectClear so clicking outside closes the popover and deselects the chip
  - padding: 6px 10px !important overrides gantt-popover base padding: 4px
metrics:
  duration: 56s
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-055 Plan 01: Popover Dep Chip Summary

**One-liner:** Radix controlled Popover on dep chip click shows Russian human-readable dependency description (type + lag-aware, FS/FF/SS/SF).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add formatDepDescription helper and wire Popover into DepChip | a76a261 | TaskListRow.tsx |
| 2 | Add CSS for dep info popover content | 0a169d1 | TaskList.css |

## What Was Built

Added a `formatDepDescription(type, lag, predecessorName)` pure function above the DepChip component that produces Russian human-readable descriptions:

- FS+2 → "Через 2 дн. после окончания [name]"
- FF0 → "После окончания [name]"
- FF-2 → "За 2 дн. до окончания [name]"
- SS → "Одновременно с началом [name]"
- SS+2 → "Через 2 дн. после начала [name]"
- SF → "До начала [name]"

The DepChip JSX return is now wrapped in `<Popover open={isSelected} onOpenChange={...}>`. The chip span is the `PopoverTrigger` (asChild). The `PopoverContent` renders with `portal={true} side="top" align="start"` showing the formatted description string above the chip when selected.

CSS class `.gantt-tl-dep-info-popover` added after the trash hover rule with font-size 0.75rem, color #374151, padding 6px 10px (overrides base), max-width 260px, line-height 1.4, white-space normal.

## Decisions Made

- Popover wraps full DepChip return (chip-wrapper span sits inside Popover, not inside Trigger) — valid Radix structure where Trigger/Content just need to be descendants of Popover root
- FS and FF share end-based language ("окончания"); SS and SF share start-based language ("начала")
- `onOpenChange={(open) => { if (!open) onChipSelectClear(); }}` ensures popover closes when user clicks outside, keeping chip deselection in sync
- `padding: 6px 10px !important` overrides the `gantt-popover` base class's `padding: 4px`

## Verification

- TypeScript: No new errors in TaskListRow.tsx (pre-existing errors in useTaskDrag and index.ts unrelated)
- `.gantt-tl-dep-info-popover` rule confirmed present in TaskList.css at line 319
- Popover structure: `formatDepDescription` exists above DepChip, DepChip return uses `<Popover open={isSelected}>`, `PopoverContent` with `side="top"` shows description string

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- FOUND: packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
- FOUND: packages/gantt-lib/src/components/TaskList/TaskList.css

Commits exist:
- FOUND: a76a261 (feat(quick-055): add formatDepDescription helper and Popover to DepChip)
- FOUND: 0a169d1 (feat(quick-055): add CSS styles for dep info popover content)
