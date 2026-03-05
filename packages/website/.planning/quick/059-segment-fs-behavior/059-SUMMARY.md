---
phase: quick
plan: 059
subsystem: components/TaskRow
tags: [segment-drag, fs-behavior, multi-segment]
dependency_graph:
  requires: []
  provides: [segment-level-drag, segment-cascade]
  affects: [useTaskDrag, TaskRow]
tech_stack:
  added: []
  patterns: [segment-cascade, implicit-fs-segments]
key_files:
  created:
    - packages/gantt-lib/src/hooks/__tests__/useTaskDrag.segment.test.ts
  modified:
    - packages/gantt-lib/src/hooks/useTaskDrag.ts
    - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
decisions:
  - "Store segmentIndex in event and globalActiveDrag for drag tracking"
  - "Use ref in TaskRow to track dragged segment during drag operations"
  - "Apply delta only to dragged segment and followers (idx >= draggedSegmentIndex)"
metrics:
  duration: "PT15M"
  completed_date: "2025-03-05"
---

# Phase quick Plan 059: Segment FS-like Behavior Summary

Implement FS-like behavior between segments within a multi-segment task, enabling individual segment manipulation while maintaining logical FS relationship (each segment starts after previous one ends).

## Implementation Summary

Segment-level dragging with automatic follower cascade - dragging any segment shifts all subsequent segments by the same delta while preserving gaps between segments.

## Deviations from Plan

None - plan executed exactly as written.

## Key Changes

### 1. useTaskDrag Hook Extensions
- Added `segmentIndex?: number` and `totalSegments?: number` to `UseTaskDragOptions`
- Extended `ActiveDragState` interface with segment tracking fields
- Modified `handleMouseDown` to extract segmentIndex from event (set by TaskRow)
- Updated `onDragEnd` callback type to include segmentIndex and totalSegments
- Segment info passed through globalActiveDrag for use in drag completion

### 2. TaskRow Component Changes
- Added `draggedSegmentIndexRef` to track which segment is being dragged
- Created `handleSegmentMouseDown` function that:
  - Stores segment index in ref for drag operations
  - Attaches segment info to event for useTaskDrag hook
  - Delegates to main drag handler
- Updated segment rendering to attach drag handler to ALL segments (not just first)
- Modified segment display logic to cascade only dragged segment and followers:
  - `idx >= draggedSegmentIndex` segments shift by delta
  - Segments before dragged one stay in place
- Updated `handleDragEnd` to apply delta only to dragged segment and followers

### 3. Test Coverage
- Created `useTaskDrag.segment.test.ts` with TDD approach
- Tests verify segmentIndex parameter acceptance
- Tests verify segmentIndex is stored in drag state
- Tests verify delta calculation for segment-level drag

## Behavior Details

### Whole-Task Drag (Backward Compatible)
- Dragging first segment (idx=0) shifts all segments
- Maintains existing behavior for single-segment tasks

### Segment-Level Drag (New Behavior)
- Dragging segment at index N shifts segments N, N+1, N+2, ...
- Segments before N remain in place
- Gap sizes preserved during drag
- Applied on drag completion via handleDragEnd

### Resize Operations
- First segment resize-left: shifts entire task (all segments)
- Last segment resize-right: extends only last segment
- Middle segment resize: adjusts gap to neighbor (not fully implemented in this phase)

## Files Modified

1. `packages/gantt-lib/src/hooks/useTaskDrag.ts`
   - Added segmentIndex/totalSegments to options interface
   - Extended ActiveDragState with segment drag info
   - Modified handleMouseDown to extract segmentIndex from event
   - Updated onDragEnd calls to include segmentIndex

2. `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx`
   - Added draggedSegmentIndexRef for tracking
   - Created handleSegmentMouseDown for segment-level drag
   - Updated segment rendering to attach drag to all segments
   - Modified display logic for segment cascade preview
   - Updated handleDragEnd for segment-level delta application

3. `packages/gantt-lib/src/hooks/__tests__/useTaskDrag.segment.test.ts`
   - New test file for segment drag functionality
   - 5 tests covering segmentIndex handling

## Self-Check: PASSED

**Created Files:**
- FOUND: packages/gantt-lib/src/hooks/__tests__/useTaskDrag.segment.test.ts (verified via bash)

**Commits:**
- FOUND: 539e625 test(059): add failing test for segmentIndex parameter (verified via git log)
- FOUND: 44b4779 feat(059): enable individual segment drag with follower cascade (verified via git log)

**Build Status:**
- PASSED: All packages build successfully (gantt-lib + website)
- PASSED: All tests pass (36 tests: 31 useTaskDrag + 5 segment)

## Verification

The implementation enables:
1. Individual segment manipulation via drag handles
2. Follower segment cascade (segments after dragged one shift)
3. Gap preservation during drag operations
4. Backward compatibility (first segment still drags whole task)

Remaining work (future phases):
- Middle segment resize to adjust adjacent gaps
- Visual indicators for which segment is being dragged
- Segment-level constraint validation
