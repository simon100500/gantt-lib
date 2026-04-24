---
phase: 30-resource-mode
plan: 03
subsystem: ui
tags: [react, typescript, resource-planner, drag, tests]
requires:
  - phase: 30-resource-mode
    provides: "Plan 30-02 ResourceTimelineChart renderer and layout geometry"
provides:
  - "Resource-specific item drag hook"
  - "Horizontal day-snapped resource item moves"
  - "Vertical target resource reassignment"
  - "Readonly, locked, and outside-drop drag gates"
affects: [resource-mode, drag, renderer]
tech-stack:
  added: []
  patterns: [controlled-resource-move, resource-row-hit-testing, move-only-drag]
key-files:
  created:
    - packages/gantt-lib/src/hooks/useResourceItemDrag.ts
    - packages/gantt-lib/src/__tests__/resourceTimelineDrag.test.tsx
  modified:
    - packages/gantt-lib/src/hooks/index.ts
    - packages/gantt-lib/src/components/ResourceTimelineChart/ResourceTimelineChart.tsx
    - packages/gantt-lib/src/components/ResourceTimelineChart/ResourceTimelineChart.css
key-decisions:
  - "Resource drag is move-only and emits a controlled callback instead of mutating resources internally."
  - "Horizontal movement snaps to day-width deltas and preserves item duration."
  - "Target resource resolution uses resource row layout bounds and cancels outside all rows."
patterns-established:
  - "Resource interactions stay isolated from task scheduling, dependencies, resize, hierarchy, and reorder code."
  - "Preview state is local to the resource hook and reflected through CSS class plus inline preview position."
requirements-completed: [RP-06, RP-07, RP-08, RP-09]
duration: 12min
completed: 2026-04-25
---

# Phase 30 Plan 03: Resource Drag Summary

**Move-only resource item drag with day snapping, vertical reassignment, and guarded callback emission**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-25T01:26:00+03:00
- **Completed:** 2026-04-25T01:38:26+03:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `useResourceItemDrag`, a resource-specific hook that tracks active drag state, RAF-throttled preview updates, and mouseup callback emission.
- Wired `ResourceTimelineChart` item bars to support horizontal date moves and vertical resource reassignment through `onResourceItemMove`.
- Added preview styling for active drag and disabled styling for readonly or locked items.
- Added regression tests for one-day horizontal movement, duration preservation, vertical reassignment, outside-drop cancellation, readonly, locked items, overlap-allowed target drops, and callback-on-mouseup behavior.

## Task Commits

1. **Task 1: Implement horizontal resource item drag** - `7ad6e7b` (feat)
2. **Task 2: Implement vertical resource target resolution and drag gates** - `7ad6e7b` (feat)

## Files Created/Modified

- `packages/gantt-lib/src/hooks/useResourceItemDrag.ts` - Resource-specific drag hook and move callback assembly.
- `packages/gantt-lib/src/hooks/index.ts` - Hook barrel export.
- `packages/gantt-lib/src/components/ResourceTimelineChart/ResourceTimelineChart.tsx` - Drag wiring and preview state application.
- `packages/gantt-lib/src/components/ResourceTimelineChart/ResourceTimelineChart.css` - Dragging and disabled item styling.
- `packages/gantt-lib/src/__tests__/resourceTimelineDrag.test.tsx` - Interaction regression coverage.

## Decisions Made

- The hook emits move requests only on `mouseup`; `mousemove` updates preview state only.
- Overlap on a target resource is allowed because consumers own validation and the next render recomputes lanes.
- Resource row hit testing uses layout row bounds, keeping the hook independent of DOM measurement and task scheduling internals.

## Deviations from Plan

### Auto-fixed Issues

**1. Resource row hit testing needed viewport offset compensation**
- **Found during:** Phase-level review
- **Issue:** Initial vertical drop target resolution compared raw `clientY` against resource row layout offsets. That only worked when the grid started at viewport Y=0.
- **Fix:** Passed the resource grid ref into `useResourceItemDrag`, subtracted `getBoundingClientRect().top`, and added regression coverage with a mocked grid offset.
- **Files modified:** `packages/gantt-lib/src/hooks/useResourceItemDrag.ts`, `packages/gantt-lib/src/components/ResourceTimelineChart/ResourceTimelineChart.tsx`, `packages/gantt-lib/src/__tests__/resourceTimelineDrag.test.tsx`
- **Verification:** `npm test -- --run src/__tests__/resourceTimelineDrag.test.tsx src/__tests__/resourceTimelineChart.test.tsx src/__tests__/resourceModeRegression.test.tsx`; `npm run build`
- **Committed in:** `c3d039f`

---

**Total deviations:** 1 auto-fixed correctness issue.
**Impact on plan:** No scope change; this makes vertical reassignment work when the chart is not positioned at the top of the viewport.

## Issues Encountered

The Wave 3 subagent could not start because of a usage limit. Execution continued inline from the existing untracked test stub and completed locally.

## User Setup Required

None - no external service configuration required.

## Verification

- `cd packages/gantt-lib && npm test -- --run src/__tests__/resourceTimelineDrag.test.tsx` - passed, 6 tests.
- `rg "core/scheduling|cascade|DependencyLines|resize-left|resize-right|onTasksChange" packages/gantt-lib/src/hooks/useResourceItemDrag.ts` - no matches.
- `cd packages/gantt-lib && npm test -- --run src/__tests__/resourceTimelineDrag.test.tsx src/__tests__/resourceTimelineChart.test.tsx src/__tests__/resourceModeRegression.test.tsx` - passed, 14 tests.
- `cd packages/gantt-lib && npm run build` - passed.

## Next Phase Readiness

Plan 30-04 can finalize public exports and documentation for `ResourceTimelineChart`, resource types, and drag behavior.

---
*Phase: 30-resource-mode*
*Completed: 2026-04-25*
