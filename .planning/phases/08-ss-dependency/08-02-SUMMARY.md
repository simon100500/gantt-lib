---
phase: 08-ss-dependency
plan: 02
subsystem: ui
tags: [typescript, vitest, gantt, dependency, drag, ss-constraint]

# Dependency graph
requires:
  - phase: 08-ss-dependency-01
    provides: getSuccessorChain with linkTypes parameter, recalculateIncomingLags with SS formula
provides:
  - Full SS constraint enforcement in useTaskDrag: split cascade chains, mode-aware cascade emission, SS lag floor
  - Constraint clamp includes SS type (B cannot start before A)
  - handleComplete with dual-delta logic and linkType-parameterized chain selection
affects: [08-ss-dependency-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Split cascade chain pattern: cascadeChain (FS+SS for move), cascadeChainFS (resize-right), cascadeChainSS (resize-left)"
    - "Mode-aware chain selection at emission time, not at assignment time"
    - "SS lag floor in live preview: Math.max(chainLeft, newLeft) keeps startB >= startA"
    - "Dual-delta completion logic: deltaFromStart for move/resize-left, deltaFromEnd for resize-right"

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/hooks/useTaskDrag.ts

key-decisions:
  - "Mode filtering happens at cascade emission time (not drag start) to avoid storing mode state at assignment"
  - "cascadeChain computed for all modes on drag start — avoids re-computing on mode change"
  - "SS lag floor (Math.max) applied only in move and resize-left modes — resize-right never changes startA"
  - "Dual-delta approach: detect resize-right by checking if startDate changed (deltaFromStart === 0)"
  - "chainForCompletion uses ['FS','SS'] when startDate moved, ['FS'] when only endDate moved"

patterns-established:
  - "activeChain ternary: resize-right -> cascadeChainFS, resize-left -> cascadeChainSS, move -> cascadeChain"
  - "Constraint clamp: dep.type !== 'FS' && dep.type !== 'SS' catches both dependency types"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 8 Plan 02: SS Constraint Enforcement in useTaskDrag Summary

**SS cascade chains wired into useTaskDrag: split chains per mode, SS lag floor in live preview, dual-delta handleComplete, resize-left A cascade to SS successors**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-22T12:40:14Z
- **Completed:** 2026-02-22T12:42:23Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- `ActiveDragState` extended with `cascadeChainFS` (FS-only) and `cascadeChainSS` (SS-only) alongside `cascadeChain` (FS+SS combined for move)
- `handleMouseDown` populates all three chains on drag start for any mode — mode filtering deferred to emission time
- Constraint clamp in `handleGlobalMouseMove` extended from FS-only to FS and SS (`dep.type !== 'FS' && dep.type !== 'SS'`)
- Mode-aware cascade emission: `activeChain` selected from correct chain based on drag mode; SS lag floor applied via `Math.max(chainLeft, newLeft)` during move and resize-left
- `handleComplete` uses dual-delta logic: `deltaFromStart` (move/resize-left) vs `deltaFromEnd` (resize-right, detected when `deltaFromStart === 0`)
- `chainForCompletion` uses `getSuccessorChain` with `['FS','SS']` when start moved, `['FS']` when only end moved
- All 127 tests pass; TypeScript build clean (ESM + CJS + DTS)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend ActiveDragState and handleMouseDown with split cascade chains** - `9bff76a` (feat)
2. **Task 2: Implement SS constraint clamp, mode-aware cascade, resize-left cascade** - `4caced5` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `packages/gantt-lib/src/hooks/useTaskDrag.ts` - Added cascadeChainFS and cascadeChainSS to ActiveDragState; handleMouseDown populates all three chains; constraint clamp includes SS; mode-aware cascade emission with SS lag floor; dual-delta handleComplete; linkType-parameterized chainForCompletion

## Decisions Made
- Mode filtering at emission time (not assignment) avoids having to re-assign chains when mode changes
- All three chains computed on drag start regardless of mode — computationally cheap, simplifies the code
- SS lag floor only applied in move and resize-left modes: resize-right never changes `startA` so the floor never applies in that branch
- Dual-delta: detecting resize-right by `deltaFromStart === 0` is reliable because resize-right clamps the task's left edge (so `finalLeft === initialLeft` → `newStartDate === initialStartDate`)
- `chainForCompletion` uses parameterized `getSuccessorChain` (from Plan 01) so no new utility code needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full SS constraint behavior now implemented for hard mode (onCascade) and soft mode (onDragEnd updatedDependencies via Plan 01's recalculateIncomingLags SS formula)
- All 6 SS drag scenarios are now covered: A moves (B follows), B moves left (blocked at A.start), A resize-right (B stays), A resize-left (B follows), B resize-left (blocked), B resize-right (unaffected)
- Plan 03 (if any) can rely on complete SS enforcement in useTaskDrag

---
*Phase: 08-ss-dependency*
*Completed: 2026-02-22*
