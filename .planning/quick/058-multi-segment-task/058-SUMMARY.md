---
phase: quick
plan: 058
subsystem: task-rendering
tags: [multi-segment, intermittent-work, task-bar]
dependency_graph:
  requires: []
  provides: [task-segments, multi-segment-rendering]
  affects: [TaskRow, Task-type]
tech_stack:
  added: [TaskSegment interface, segments property]
  patterns: [segments.map, useMemo segments derivation]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/types/index.ts
    - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
    - packages/gantt-lib/src/components/TaskRow/TaskRow.css
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/website/src/app/page.tsx
decisions:
  - "Multi-segment tasks are locked (no drag/resize) for simplicity"
  - "Task name and labels render once per row, not per segment"
  - "Gaps between segments are natural from date ranges (no special CSS)"
  - "Backward compatibility: tasks without segments use startDate/endDate"
metrics:
  duration_seconds: 144
  completed_date: "2026-03-04T21:27:39Z"
---

# Phase Quick Plan 058: Multi-Segment Task Summary

**One-liner:** Added support for multiple task bar segments in a single task row, enabling visualization of intermittent work execution periods within a single task.

## Overview

Implemented multi-segment task rendering to support intermittent work execution scenarios where a single task has multiple execution periods (segments) in one row, rather than creating separate tasks. This represents stages of executing one work with gaps between active periods.

## What Was Built

### 1. TaskSegment Type (Task 1)
- Added `TaskSegment` interface with `startDate` and `endDate` properties
- Extended `Task` interface with optional `segments?: TaskSegment[]` array
- Maintained backward compatibility with existing `startDate`/`endDate` properties
- Files modified: `packages/gantt-lib/src/types/index.ts`, `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`

### 2. Multi-Segment Rendering (Task 2)
- Added `segments` derivation logic using `useMemo` with fallback to single segment
- Updated rendering to map over segments array, rendering multiple bars per row
- Moved labels outside segment map: task name and date labels render once per row
- Disabled drag/resize for multi-segment tasks (locked behavior)
- Files modified: `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx`

### 3. Multi-Segment CSS Styling (Task 3)
- Added `.gantt-tr-taskSegment` class for segment bars
- Segments inherit all `.gantt-tr-taskBar` styles
- Gaps between segments are natural from date ranges (no special gap CSS)
- Files modified: `packages/gantt-lib/src/components/TaskRow/TaskRow.css`

### 4. Demo Section (Task 4)
- Added `createMultiSegmentTasks()` function with sample tasks
- Added demo section showing 2 multi-segment tasks and 1 normal task
- Visualizes intermittent work execution patterns with clear gaps
- Files modified: `packages/website/src/app/page.tsx`

## Deviations from Plan

None - plan executed exactly as written.

## Key Design Decisions

1. **Multi-segment tasks are locked:** Disabled drag/resize for tasks with multiple segments due to complex interaction semantics (which segment to move? do others follow?).

2. **Labels render once per row:** Task name and date labels appear once per row (not per segment) - date labels at leftmost segment, task name at rightmost segment.

3. **Natural gaps:** No special CSS for gaps - gaps emerge naturally from date ranges between segments.

4. **Backward compatibility:** Tasks without `segments` array continue to work as single-bar tasks using `startDate`/`endDate`.

## Technical Details

### Rendering Logic
```typescript
const segments = useMemo(() => {
  if (task.segments && task.segments.length > 0) {
    return task.segments.map(seg => ({
      startDate: parseUTCDate(seg.startDate),
      endDate: parseUTCDate(seg.endDate)
    }));
  }
  return [{ startDate: taskStartDate, endDate: taskEndDate }];
}, [task.segments, taskStartDate, taskEndDate]);
```

### Label Positioning
- **Left labels (dates):** Positioned at leftmost segment start
- **Right labels (task name):** Positioned at rightmost segment end
- **Progress:** Applied uniformly to all segments

## Testing Evidence

- TypeScript compiles without errors
- Build succeeds: `npm run build` completed in ~12s
- Demo page includes multi-segment section with 3 example tasks
- Visual gaps between segments are clear and natural

## Files Modified

| File | Changes |
|------|---------|
| `packages/gantt-lib/src/types/index.ts` | Added TaskSegment interface, segments property to Task |
| `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` | Exported TaskSegment, added segments to Task interface |
| `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx` | Multi-segment rendering logic, label positioning |
| `packages/gantt-lib/src/components/TaskRow/TaskRow.css` | .gantt-tr-taskSegment class |
| `packages/website/src/app/page.tsx` | Demo section with createMultiSegmentTasks |

## Commits

| Hash | Message |
|------|---------|
| 7e825c4 | feat(058): add TaskSegment interface and segments array to Task |
| 7a06786 | feat(058): update TaskRow to render multiple segments |
| b35d74d | feat(058): add CSS for multi-segment styling |
| e2611a5 | feat(058): add demo tasks with multiple segments |

## Verification

- [x] TypeScript compiles without errors
- [x] Demo page renders multi-segment tasks correctly
- [x] Visual gaps between segments are clear
- [x] Task name and labels appear once per row
- [x] Single-segment tasks (backward compatibility) still work
- [x] Drag/resize behavior disabled for multi-segment tasks
