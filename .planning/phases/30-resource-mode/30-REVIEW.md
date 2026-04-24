---
phase: 30-resource-mode
status: clean
reviewed: 2026-04-25
depth: standard-inline
---

# Phase 30 Code Review

## Scope

Reviewed resource planner source changes from plans 30-01 through 30-04:

- `packages/gantt-lib/src/types/index.ts`
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`
- `packages/gantt-lib/src/components/GanttChart/index.tsx`
- `packages/gantt-lib/src/components/ResourceTimelineChart/*`
- `packages/gantt-lib/src/hooks/useResourceItemDrag.ts`
- `packages/gantt-lib/src/utils/resourceTimelineLayout.ts`
- resource/export regression tests and public docs

## Findings

No open blocking findings.

## Resolved During Review

### Resource vertical drop target used viewport Y without grid offset

- **Severity:** high
- **Files:** `packages/gantt-lib/src/hooks/useResourceItemDrag.ts`, `packages/gantt-lib/src/components/ResourceTimelineChart/ResourceTimelineChart.tsx`
- **Issue:** `clientY` was compared directly with layout row offsets, so charts rendered below the viewport top could resolve the wrong target resource or cancel a valid drop.
- **Fix:** Added grid ref offset compensation and a regression test with `getBoundingClientRect().top`.
- **Commit:** `c3d039f`

## Verification

- `npm test -- --run src/__tests__/resourceTimelineDrag.test.tsx src/__tests__/resourceTimelineChart.test.tsx src/__tests__/resourceModeRegression.test.tsx` - passed, 14 tests.
- `npm test -- --run src/__tests__/resourceTimelineLayout.test.ts src/__tests__/resourceTimelineChart.test.tsx src/__tests__/resourceTimelineDrag.test.tsx src/__tests__/resourceModeRegression.test.tsx src/__tests__/export-contract.test.ts src/__tests__/dependencyLines.test.tsx` - passed, 26 tests.
- `npm run build` - passed.
- Isolation grep for task-only systems in resource renderer/hook - no matches.

## Residual Risk

`npm test` still fails in unrelated pre-existing suites outside the resource mode scope. Those failures are documented in `30-04-SUMMARY.md` and `30-VERIFICATION.md`.
