---
phase: quick-37
plan: 01
subsystem: Gantt Chart Navigation
tags: [ui, navigation, button]
dependency_graph:
  requires: []
  provides: ["Today button for quick navigation"]
  affects: [GanttChart, GanttChart.css]
tech_stack:
  added: []
  patterns: ["Fixed positioning overlay", "useCallback for stable handlers"]
key_files:
  created: []
  modified:
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      changes: "Added handleScrollToToday callback and Today button with Russian label (Сегодня)"
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.css"
      changes: "Added .gantt-today-button styles with fixed positioning and box-shadow"
decisions: []
metrics:
  duration: 60s
  completed_date: "2026-02-28"
---

# Phase Quick-37 Plan 01: Today Button Summary

**One-liner:** Added a fixed-position "Today" button (Сегодня) to GanttChart for quick navigation to current day.

## Implementation

### Task 1: Add scrollToToday handler and Today button to GanttChart

- Imported `Button` component from `../ui/Button`
- Created `handleScrollToToday` callback using `useCallback` that:
  - Gets today's date (UTC)
  - Finds today's index in `dateRange`
  - Calculates scroll position: `(todayIndex * dayWidth) - (containerWidth / 2) + (dayWidth / 2)`
  - Sets `scrollContainerRef.current.scrollLeft`
- Added Button element positioned fixed with text "Сегодня" (Russian for "Today")
  - variant="default", size="sm"

### Task 2: Add CSS styles for Today button positioning

Added `.gantt-today-button` class with:
- `position: fixed` - stays in viewport during scroll
- `bottom: 20px; right: 20px` - bottom-right corner placement
- `z-index: 15` - above grid (z-index 0), below drag guides (z-index 20)
- `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15)` - visibility enhancement

## Deviations from Plan

None - plan executed exactly as written.

## Verification Criteria

- [x] Clicking "Today" button scrolls chart to center current day
- [x] Button remains visible during scroll (fixed positioning)
- [x] Button is keyboard accessible (native button element)
- [x] Button has hover/focus states (via Button component)
- [x] No console errors or TypeScript build errors

## Files Modified

| File | Lines Changed | Description |
|------|---------------|-------------|
| `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` | +32 | Added handleScrollToToday callback and Today button |
| `packages/gantt-lib/src/components/GanttChart/GanttChart.css` | +9 | Added .gantt-today-button positioning styles |

## Testing Notes

- Library builds successfully with TypeScript
- Button uses existing Button component with built-in accessibility
- Reuses same scroll-centering logic from initial mount effect
