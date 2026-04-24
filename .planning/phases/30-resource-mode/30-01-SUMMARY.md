---
phase: 30-resource-mode
plan: 01
subsystem: ui
tags: [react, typescript, resource-planner, layout, tests]
requires:
  - phase: 29-milestones-type-tasks
    provides: "Verified task-mode compatibility baseline before resource mode split"
provides:
  - "Public resource timeline data contracts"
  - "Discriminated GanttChartProps with default task-mode compatibility"
  - "Pure deterministic resource lane layout utility"
  - "Resource mode boundary and layout regression coverage"
affects: [resource-mode, gantt-chart, exports, renderer, drag]
tech-stack:
  added: []
  patterns: [discriminated-props, pure-layout-utility, inclusive-overlap-lanes]
key-files:
  created:
    - packages/gantt-lib/src/__tests__/resourceModeRegression.test.tsx
    - packages/gantt-lib/src/__tests__/resourceTimelineLayout.test.ts
    - packages/gantt-lib/src/utils/resourceTimelineLayout.ts
  modified:
    - packages/gantt-lib/src/types/index.ts
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/gantt-lib/src/components/GanttChart/index.tsx
    - packages/gantt-lib/src/index.ts
    - packages/gantt-lib/src/utils/index.ts
key-decisions:
  - "Keep omitted mode as task gantt behavior via mode?: 'gantt'."
  - "Use a temporary resource-planner placeholder branch until Plan 30-02 replaces it with the real renderer."
  - "Treat same-day item boundary collisions as inclusive overlap and place them in separate lanes."
patterns-established:
  - "Resource mode is separated by a discriminated union instead of optional task props."
  - "Resource layout remains DOM-free and scheduling-core-free for renderer and drag reuse."
requirements-completed: [RP-01, RP-02, RP-03, RP-04, RP-05, RP-11]
duration: 10min
completed: 2026-04-25
---

# Phase 30: Resource Mode Plan 01 Summary

**Resource planner public contracts and deterministic lane layout with task-mode compatibility tests**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-25T00:00:00+03:00
- **Completed:** 2026-04-25T00:09:54+03:00
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added public resource planner types: `GanttChartMode`, `ResourceTimelineItem`, `ResourceTimelineResource`, `ResourceTimelineMove`, and `ResourcePlannerChartProps`.
- Converted `GanttChartProps` to a discriminated union while preserving `<GanttChart tasks={tasks} />` and explicit `mode="gantt"`.
- Added `layoutResourceTimelineItems`, including stable ordering, inclusive overlap lane assignment, empty resource row height, and invalid-date diagnostics.
- Added regression coverage for task/resource mode boundaries and resource lane layout behavior.

## Task Commits

1. **Task 1: Lock public contracts and mode-boundary tests** - `b520132` (test), `4c36ca9` (feat)
2. **Task 2: Implement pure resource lane layout** - `bf2308d` (feat)

## Files Created/Modified

- `packages/gantt-lib/src/types/index.ts` - Resource planner public contracts.
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` - Discriminated prop union and temporary resource branch.
- `packages/gantt-lib/src/components/GanttChart/index.tsx` - Resource type re-exports.
- `packages/gantt-lib/src/index.ts` - Root type export cleanup for declaration build compatibility.
- `packages/gantt-lib/src/utils/index.ts` - Exports the resource timeline layout utility.
- `packages/gantt-lib/src/utils/resourceTimelineLayout.ts` - Pure resource lane layout implementation.
- `packages/gantt-lib/src/__tests__/resourceModeRegression.test.tsx` - Mode boundary regression tests.
- `packages/gantt-lib/src/__tests__/resourceTimelineLayout.test.ts` - Lane layout regression tests.

## Decisions Made

- Invalid item dates are reported in `diagnostics` and skipped from item geometry instead of failing the whole layout.
- Lane reuse requires the previous lane end day to be strictly before the next start day, preserving inclusive overlap semantics.
- Root package resource type exports remain sourced through `components/GanttChart` to avoid duplicate declaration identifiers.

## Deviations from Plan

### Auto-fixed Issues

**1. Declaration build duplicate type exports**
- **Found during:** Plan verification build
- **Issue:** `src/index.ts` re-exported the same resource types from both `components/GanttChart` and `types`, causing DTS duplicate identifier errors.
- **Fix:** Kept root resource type exports through `components/GanttChart` and removed duplicate entries from the final `types` export block.
- **Files modified:** `packages/gantt-lib/src/index.ts`
- **Verification:** `npm run build`
- **Committed in:** `bf2308d`

---

**Total deviations:** 1 auto-fixed build-contract issue.
**Impact on plan:** No scope change; the fix preserves the intended public export surface and makes declaration generation pass.

## Issues Encountered

The executor stream disconnected after landing the first two commits. Spot-check recovery found the missing layout utility, completed Task 2, and verified the plan locally.

## User Setup Required

None - no external service configuration required.

## Verification

- `cd packages/gantt-lib && npm test -- --run src/__tests__/resourceTimelineLayout.test.ts src/__tests__/resourceModeRegression.test.tsx` - passed, 9 tests.
- `cd packages/gantt-lib && npm test -- --run src/__tests__/resourceTimelineLayout.test.ts src/__tests__/resourceModeRegression.test.tsx src/__tests__/export-contract.test.ts` - passed, 13 tests.
- `cd packages/gantt-lib && npm run build` - passed.

## Next Phase Readiness

Plan 30-02 can replace the temporary resource planner placeholder with the real `ResourceTimelineChart` renderer using the public contracts and `layoutResourceTimelineItems` utility.

---
*Phase: 30-resource-mode*
*Completed: 2026-04-25*
