---
phase: 10-sf-dependency
plan: 01
subsystem: dependencies
tags: [sf-dependency, cascade, lag-recalculation, constraint-enforcement]

# Dependency graph
requires:
  - phase: 09-ff-dependency
    provides: FF cascade chains, end-based positioning, FF lag recalculation
provides:
  - SF (Start-to-Finish) dependency constraint enforcement
  - SF cascade chains for move and resize-left modes
  - SF lag recalculation with ceiling at 0
  - Complete coverage of all four link types (FS/SS/FF/SF)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - End-based cascade positioning for SF (like FF)
    - Width-based constraint clamp (not left-based)
    - Math.min(0, ...) for SF lag ceiling (opposite of SS's Math.max)

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/hooks/useTaskDrag.ts
    - packages/website/src/app/page.tsx

key-decisions:
  - "SF cascade preview uses end-based positioning (like FF) because SF constrains endB to startA"
  - "SF constraint clamp affects width (not left) because it constrains endB, not startB"
  - "SF lag uses Math.min(0, ...) for ceiling (opposite of SS's Math.max(0, ...) floor)"
  - "Renamed cascadeChainSS to cascadeChainStart for clarity (SS+SF)"

patterns-established:
  - "All four link types (FS/SS/FF/SF) now supported with proper cascade and constraint behavior"
  - "Position-based constraints (FS/SS) clamp left; end-based constraints (FF/SF) clamp width"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 10 Plan 1: SF Dependency Constraint Enforcement Summary

**Complete SF (Start-to-Finish) dependency support with cascade chains from predecessor startA, end-based constraint positioning, and lag ceiling at 0**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T16:23:57Z
- **Completed:** 2026-02-22T16:27:41Z
- **Tasks:** 3 (2 implementation + checkpoint)
- **Files modified:** 2

## Accomplishments

- Extended ActiveDragState with cascadeChainStart (SS+SF for resize-left mode)
- Added SF to all cascade chains (move mode includes all four types)
- Implemented SF constraint clamp (endB <= startA, affects width not left)
- Extended recalculateIncomingLags with SF case using Math.min(0, ...) ceiling
- Added SF demo tasks to Construction Project (elevator equipment delivery scenario)
- Fixed SF cascade preview to use end-based positioning (like FF)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend useTaskDrag with SF cascade chains and constraint enforcement** - `203e842` (feat)
2. **Task 3: Add SF demo tasks to Construction Project** - `5853862` (feat)
3. **Auto-fix: Add SF cascade preview positioning from end offset** - `59f4720` (fix)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `packages/gantt-lib/src/hooks/useTaskDrag.ts` - SF cascade chains, constraint clamp, lag recalculation
- `packages/website/src/app/page.tsx` - SF demo tasks (elevator equipment delivery scenario)

## Decisions Made

- SF cascade preview uses end-based positioning (like FF) because SF constrains endB to startA
- SF constraint clamp affects width (not left) because it constrains endB, not startB
- SF lag uses Math.min(0, ...) for ceiling (opposite of SS's Math.max(0, ...) floor)
- Renamed cascadeChainSS to cascadeChainStart for clarity (SS+SF share start-based cascade behavior)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SF cascade preview positioning was incorrect**
- **Found during:** Task 1 (implementation verification)
- **Issue:** SF cascade preview was using start-based positioning (like FS/SS), but SF constrains endB to startA, so it needs end-based positioning (like FF)
- **Fix:** Added hasSFDepOnDragged check to position SF tasks from end offset, then back up by duration
- **Files modified:** packages/gantt-lib/src/hooks/useTaskDrag.ts
- **Verification:** Build passes, cascade preview correctly positions SF tasks
- **Committed in:** `59f4720` (separate fix commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary for correctness. No scope creep.

## Issues Encountered

None - implementation proceeded smoothly.

## User Setup Required

None - verification done via dev server at http://localhost:3000

## Next Phase Readiness

- Phase 10 is the final phase of the roadmap - all four link types (FS/SS/FF/SF) are now fully supported
- SF dependency demo tasks available for manual verification
- Complete dependency constraint system ready for production use

---
*Phase: 10-sf-dependency*
*Completed: 2026-02-22*
