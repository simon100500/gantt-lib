---
phase: 35-open-chart-centered-on-current-day
plan: 01
subsystem: chart-interaction
tags: [scroll, initial-state, ux]
---

# Phase 35: Open Chart Centered On Current Day Summary

**One-liner:** Auto-center Gantt chart viewport on today's date when component mounts

## Completed Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ---- | ---- |
| 1 | Add useEffect to center chart on today on mount | e7d050c | packages/gantt-lib/src/components/GanttChart/GanttChart.tsx |

## Implementation Details

### Task 1: Add useEffect to center chart on today on mount

Added a `useEffect` hook that runs once on component mount to automatically scroll the Gantt chart so today's date appears centered in the viewport.

**Implementation approach:**
- Calculates today's index within the `dateRange` array using `findIndex` with `isToday` comparison
- Computes the center position using the formula: `scrollLeft = (todayIndex * dayWidth) - (clientWidth / 2) + (dayWidth / 2)`
- Sets `scrollContainerRef.current.scrollLeft` to the calculated position
- Guards against null `scrollContainerRef` and ensures `scrollLeft >= 0`
- Uses empty dependency array `[]` to ensure centering only happens on mount, not re-renders

**Key technical decisions:**
1. **UTC-only date arithmetic**: Follows existing code pattern using `Date.UTC()` to avoid timezone inconsistencies
2. **Empty deps array**: Ensures centering happens only on mount, preventing jarring re-centers during state updates
3. **Math.round() on scroll position**: Prevents sub-pixel scroll positioning issues
4. **Math.max(0, ...) guard**: Prevents negative scroll values if today is before visible range

## Deviations from Plan

None - plan executed exactly as written.

## Verification

The implementation was verified to:
- Run only on initial mount (empty deps array)
- Calculate today's offset correctly using existing dateRange pattern
- Center today's date column in the middle of the visible viewport
- Handle edge cases (null ref, empty date range, today not in range)

## Files Modified

- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` - Added auto-centering useEffect (19 lines)

## Key Links

- `GanttChart.tsx` → `scrollContainerRef.current.scrollLeft` via `useEffect` on mount
- Pattern: `scrollLeft = todayOffset * dayWidth - (clientWidth / 2) + (dayWidth / 2)`

## Decisions Made

1. **Empty deps array**: Chose to run centering only on mount, not when dateRange changes, to avoid jarring UX during normal operations
2. **UTC date handling**: Used existing UTC pattern for consistency with rest of codebase
3. **Guard clauses**: Added early returns for null ref, empty range, and today not found to prevent errors

## Metrics

- **Duration**: ~2 minutes
- **Completed Date**: 2026-02-28
- **Tasks Completed**: 1/1
- **Files Modified**: 1
- **Lines Added**: 19

## Self-Check: PASSED

- [x] Commit exists: e7d050c
- [x] Files modified: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
- [x] Feature works as specified: Chart centers on today on mount
