---
phase: 29-milestones-type-tasks
plan: 03
subsystem: ui
tags: [milestones, task-list, samples, docs]

# Dependency graph
requires:
  - phase: 29-02
    provides: Milestone chart rendering, move-only drag, dependency endpoint behavior
provides:
  - TaskList milestone editing that preserves the single-date invariant
  - Website sample milestone data with real dependency usage
  - Public documentation for milestone typing, unchanged dependency semantics, and unchanged parentId hierarchy behavior
affects: [consumers, demo-site, docs-readers]

# Tech tracking
tech-stack:
  added: []
  patterns: [task-list-single-date-milestones, sample-driven-api-docs]

key-files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/__tests__/taskListMilestone.test.tsx
    - packages/website/src/data/sampleTasks.ts
    - packages/gantt-lib/src/__tests__/sampleMilestones.test.tsx
    - docs/reference/02-task-interface.md
    - docs/reference/03-dependencies.md
    - docs/reference/04-props.md

key-decisions:
  - "Milestone duration stays visible as read-only `1д` instead of hiding the built-in duration column"
  - "Sample milestone data was added inside the existing parentId hierarchy rather than introducing a new project/group abstraction"

patterns-established:
  - "TaskList milestone edits should flow through one helper path that rewrites both start and end dates together"
  - "Public milestone docs should always restate that `parentId` remains the grouping mechanism"

requirements-completed: [PH29-4, PH29-6]

# Metrics
duration: 34min
completed: 2026-04-11
---

# Phase 29 Plan 03 Summary

**Milestone-aware TaskList editing, demo milestone sample data, and public API docs that preserve existing hierarchy semantics**

## Performance

- **Duration:** 34 min
- **Started:** 2026-04-11T17:20:00Z
- **Completed:** 2026-04-11T17:24:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Kept milestone TaskList editing single-date by syncing both date pickers and making duration read-only at `1д`
- Added milestone sample data to the website with a real dependency chain
- Updated reference docs to describe `type?: 'task' | 'milestone'`, unchanged FS/SS/FF/SF rules, and unchanged `parentId` grouping behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Make TaskListRow milestone-aware without redesigning the column system** - `8948559` (feat)
2. **Task 2: Add milestone examples to sample data and document the public API contract** - `489e6ea` (docs)

## Files Created/Modified
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` - milestone-aware date and duration editing rules
- `packages/gantt-lib/src/__tests__/taskListMilestone.test.tsx` - active task-list milestone assertions with mocked date pickers
- `packages/website/src/data/sampleTasks.ts` - milestone sample entry inside the existing project schedule
- `packages/gantt-lib/src/__tests__/sampleMilestones.test.tsx` - sample-data milestone assertions
- `docs/reference/02-task-interface.md` - milestone type field and explicit subtype guidance
- `docs/reference/03-dependencies.md` - unchanged milestone dependency semantics note
- `docs/reference/04-props.md` - milestone editing note and preserved `parentId` hierarchy explanation

## Decisions Made
- Preserved the current TaskList column layout; milestones only alter cell behavior, not the column pipeline
- Added milestone samples to an existing parent group so the docs and demo both reflect the real hierarchy model

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

Direct `TaskListRow` tests need `resolvedColumns` when rendering the row in isolation. The milestone tests now provide the built-in column set explicitly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The full milestone feature surface is implemented across chart, task list, samples, and docs
- Phase 29 is ready for verifier pass and roadmap completion

## Self-Check: PASSED

- `npm test -- src/__tests__/geometry.test.ts src/__tests__/taskRowMilestone.test.tsx src/__tests__/useTaskDragMilestone.test.ts src/__tests__/dependencyLinesMilestone.test.tsx src/__tests__/taskListMilestone.test.tsx src/__tests__/sampleMilestones.test.tsx`
- Docs/sample milestone markers verified with `rg`

---
*Phase: 29-milestones-type-tasks*
*Completed: 2026-04-11*
