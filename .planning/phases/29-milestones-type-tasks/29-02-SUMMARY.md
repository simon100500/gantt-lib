---
phase: 29-milestones-type-tasks
plan: 02
subsystem: ui
tags: [milestones, task-row, drag, dependency-lines, vitest]

# Dependency graph
requires:
  - phase: 29-01
    provides: Explicit milestone task subtype, normalization helper, milestone test targets
provides:
  - Fixed-size milestone geometry for chart rendering and dependency anchors
  - Diamond milestone TaskRow branch without resize handles
  - Move-only milestone drag completion and milestone-aware dependency endpoints
affects: [task-list, website-samples, docs]

# Tech tracking
tech-stack:
  added: []
  patterns: [fixed-size-milestone-geometry, move-only-milestone-drag, milestone-endpoint-anchors]

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/utils/geometry.ts
    - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
    - packages/gantt-lib/src/components/TaskRow/TaskRow.css
    - packages/gantt-lib/src/hooks/useTaskDrag.ts
    - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
    - packages/gantt-lib/src/__tests__/geometry.test.ts
    - packages/gantt-lib/src/__tests__/taskRowMilestone.test.tsx
    - packages/gantt-lib/src/__tests__/useTaskDragMilestone.test.ts
    - packages/gantt-lib/src/__tests__/dependencyLinesMilestone.test.tsx

key-decisions:
  - "Milestones reuse a one-day drag width internally but render with a fixed 14px diamond box"
  - "Dependency semantics stay unchanged; only milestone anchor geometry moves from bar edges to diamond edges"

patterns-established:
  - "Chart code should branch on `isMilestoneTask()` before rendering resize-specific UI"
  - "Dependency endpoints can stay semantic while using separate visual geometry helpers"

requirements-completed: [PH29-2, PH29-3, PH29-5]

# Metrics
duration: 41min
completed: 2026-04-11
---

# Phase 29 Plan 02 Summary

**Fixed-size milestone diamonds with move-only drag handling and milestone-aware dependency endpoints on the chart**

## Performance

- **Duration:** 41 min
- **Started:** 2026-04-11T14:31:00Z
- **Completed:** 2026-04-11T17:20:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Added `calculateMilestoneGeometry()` and used it to render visible diamond milestones on the chart
- Prevented milestone resize behavior by forcing resize intents into move mode and keeping milestone drops single-date
- Updated dependency rendering to anchor milestone links to diamond geometry without changing FS/SS/FF/SF semantics

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement milestone geometry and TaskRow diamond rendering** - `195ed4f` (feat)
2. **Task 2: Make milestone drag move-only and update dependency endpoints without changing dependency semantics** - `e4bf5bd` (feat)

## Files Created/Modified
- `packages/gantt-lib/src/utils/geometry.ts` - milestone geometry helper alongside existing bar geometry
- `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx` - milestone render branch, normalized dates, no resize handles
- `packages/gantt-lib/src/components/TaskRow/TaskRow.css` - milestone diamond styling
- `packages/gantt-lib/src/hooks/useTaskDrag.ts` - move-only milestone gating and single-date drag completion
- `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx` - milestone-aware anchor geometry plus SVG test id
- `packages/gantt-lib/src/__tests__/geometry.test.ts` - fixed-size milestone geometry coverage
- `packages/gantt-lib/src/__tests__/taskRowMilestone.test.tsx` - active diamond vs rectangular assertions
- `packages/gantt-lib/src/__tests__/useTaskDragMilestone.test.ts` - active move-only and single-date drag assertions
- `packages/gantt-lib/src/__tests__/dependencyLinesMilestone.test.tsx` - active milestone endpoint anchor assertions

## Decisions Made
- Used a fixed visible diamond size instead of a zero-width or full-day rectangle so milestones remain legible without altering scheduling math
- Kept dependency path generation unchanged and only swapped the endpoint coordinates for milestone tasks

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

The plan verification command in the workflow referenced `-x`, which this repo's Vitest CLI does not support. Verification was rerun successfully without that flag.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TaskList can now reuse the explicit milestone contract knowing chart behavior is stable
- Sample data and docs can describe milestone rendering and unchanged dependency semantics against shipped behavior

## Self-Check: PASSED

- `npm test -- src/__tests__/geometry.test.ts src/__tests__/taskRowMilestone.test.tsx src/__tests__/useTaskDragMilestone.test.ts src/__tests__/dependencyLinesMilestone.test.tsx`
- Milestone geometry/helper imports verified with `rg`

---
*Phase: 29-milestones-type-tasks*
*Completed: 2026-04-11*
