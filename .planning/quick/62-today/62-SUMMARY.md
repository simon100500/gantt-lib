---
phase: quick-62
plan: 01
subsystem: GanttChart scroll
tags: [ux, animation, scroll, smooth]
dependency_graph:
  requires: []
  provides: [smooth-scroll-to-today, smooth-scroll-to-task]
  affects: [GanttChart]
tech_stack:
  added: []
  patterns: [scrollTo-behavior-smooth]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
decisions:
  - Mount-time centering keeps direct scrollLeft assignment (no animation) to avoid slow intro on every page load
  - scrollToToday and scrollToTask use scrollTo({ behavior: 'smooth' }) for user-initiated navigation
metrics:
  duration: 3min
  completed_date: "2026-03-08"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-62 Plan 01: Smooth Scroll Animation Summary

**One-liner:** Added `behavior: 'smooth'` to user-initiated scroll methods while keeping mount-time centering instant.

## What Was Done

Replaced direct `container.scrollLeft = ...` assignments in `scrollToToday()` and `scrollToTask()` with `container.scrollTo({ left: ..., behavior: 'smooth' })` calls.

The mount-time centering in `useEffect([], [])` intentionally retains the instant assignment — users should not see an animated scroll on every page load.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace scrollLeft with scrollTo({ behavior: 'smooth' }) | bb32318 | GanttChart.tsx |

## Verification

- `grep -n "behavior.*smooth"` confirms 2 occurrences (lines 235 and 259, in scrollToToday and scrollToTask)
- Mount useEffect (line 214) still uses `container.scrollLeft =` — no smooth animation on load
- `npm run build` passes: CJS + ESM + DTS all successful in ~1.3s

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- File modified: `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` - FOUND
- Commit bb32318 - FOUND
