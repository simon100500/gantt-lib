---
phase: 30-resource-mode
plan: 04
subsystem: docs
tags: [react, typescript, resource-planner, exports, documentation, tests]
requires:
  - phase: 30-resource-mode
    provides: "Plan 30-03 resource drag behavior and callback contract"
provides:
  - "Root ResourceTimelineChart runtime export"
  - "Resource planner public type export coverage"
  - "README and reference documentation for resource mode, styling, and drag"
  - "Final targeted resource regression verification"
affects: [resource-mode, public-api, docs, exports]
tech-stack:
  added: []
  patterns: [root-runtime-export, type-contract-test, discriminated-mode-docs]
key-files:
  created: []
  modified:
    - packages/gantt-lib/src/index.ts
    - packages/gantt-lib/src/components/GanttChart/index.tsx
    - packages/gantt-lib/src/__tests__/export-contract.test.ts
    - packages/gantt-lib/README.md
    - docs/reference/04-props.md
    - docs/reference/09-styling.md
    - docs/reference/10-drag-interactions.md
key-decisions:
  - "Export ResourceTimelineChart from the package root and GanttChart barrel while keeping existing task-mode exports unchanged."
  - "Document GanttChart mode=\"resource-planner\" as the primary path and ResourceTimelineChart as the specialized direct export."
  - "Document resource reassignment authorization and conflict validation as consumer-owned."
patterns-established:
  - "Export contract tests cover runtime exports plus type-only resource contract usage."
  - "Resource docs explicitly list task-mode exclusions so consumers do not expect dependency, hierarchy, cascade, or reorder behavior in resource mode."
requirements-completed: [RP-01, RP-02, RP-06, RP-07, RP-08, RP-09, RP-10, RP-11]
duration: 14min
completed: 2026-04-25
---

# Phase 30 Plan 04: Resource API and Docs Summary

**Public resource planner export surface, documentation, and final targeted regression coverage**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-25T01:28:00+03:00
- **Completed:** 2026-04-25T01:42:16+03:00
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Exported `ResourceTimelineChart` from the package root and `components/GanttChart` barrel.
- Extended export-contract tests to prove `ResourceTimelineChart` is available at runtime and resource public types are usable from the root package.
- Added README quick start documentation for `mode="resource-planner"` and direct `ResourceTimelineChart` usage.
- Added reference documentation for the discriminated prop split, resource planner props, CSS variables, and drag behavior.
- Verified resource mode remains isolated from task-only systems and task mode still passes the targeted dependency regression.

## Task Commits

1. **Task 1: Publish resource exports and export-contract tests** - `42eeb87` (docs/test)
2. **Task 2: Update README and reference docs** - `42eeb87` (docs/test)
3. **Task 3: Close phase with regression and full package verification** - `b17b2a4` (test)

## Files Created/Modified

- `packages/gantt-lib/src/index.ts` - Root runtime export for `ResourceTimelineChart`.
- `packages/gantt-lib/src/components/GanttChart/index.tsx` - Component barrel export for `ResourceTimelineChart`.
- `packages/gantt-lib/src/__tests__/export-contract.test.ts` - Runtime and type-level export contract coverage.
- `packages/gantt-lib/README.md` - Resource planner quick start and task-mode exclusion note.
- `docs/reference/04-props.md` - Discriminated props and resource planner prop reference.
- `docs/reference/09-styling.md` - Resource planner CSS variable reference.
- `docs/reference/10-drag-interactions.md` - Resource drag behavior and consumer validation guidance.

## Decisions Made

- `ResourceTimelineChart` is public as both a root export and a component-barrel export.
- Resource CSS docs include `--gantt-resource-bar-conflict-color` as a reserved consumer/future conflict-state variable; built-in conflict rejection remains deferred.
- The export-contract root import test has a 10s timeout because the package root imports the full React/CSS-facing surface and can exceed Vitest's 5s default when run in parallel with heavier component suites.

## Deviations from Plan

### Advisory Verification Gap

- **Found during:** Full package verification
- **Issue:** `npm test` fails in existing non-resource suites: `dateUtils.test.ts`, `taskListDuration.test.tsx`, `ganttChartDatePickerTarget.test.tsx`, `ganttChartRealDatePickerTarget.test.tsx`, and `sampleMilestones.test.tsx`.
- **Assessment:** Failures are outside Phase 30 resource files and include known/baseline-looking issues such as missing `getWeekStartDays`, date range expectation drift, task-list row rendering gaps, and `rerenderedRows is not defined`.
- **Resource impact:** Targeted Phase 30 resource suite, dependency-lines regression, export contract, docs checks, and build all pass.

## Issues Encountered

Full package tests are not green due to unrelated pre-existing failures. This phase does not modify the failing task/date utility files.

## User Setup Required

None - no external service configuration required.

## Verification

- `cd packages/gantt-lib && npm test -- --run src/__tests__/export-contract.test.ts` - passed, 5 tests.
- `cd packages/gantt-lib && npm run build` - passed.
- Docs checks for `mode="resource-planner"`, `ResourceTimelineResource`, resource CSS variables, and drag terms - passed.
- Isolation check: `rg -e "DependencyLines|TaskList|core/scheduling|useTaskDrag" packages/gantt-lib/src/components/ResourceTimelineChart packages/gantt-lib/src/hooks/useResourceItemDrag.ts` - no matches.
- `cd packages/gantt-lib && npm test -- --run src/__tests__/resourceTimelineLayout.test.ts src/__tests__/resourceTimelineChart.test.tsx src/__tests__/resourceTimelineDrag.test.tsx src/__tests__/resourceModeRegression.test.tsx src/__tests__/export-contract.test.ts src/__tests__/dependencyLines.test.tsx` - passed, 26 tests.
- `cd packages/gantt-lib && npm test` - failed in pre-existing non-resource suites listed above.

## Next Phase Readiness

Phase 30 implementation is ready for phase-level verification with the caveat that the repository's full test suite has unrelated outstanding failures.

---
*Phase: 30-resource-mode*
*Completed: 2026-04-25*
