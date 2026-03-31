# Phase 28: Validation Architecture

## Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | packages/gantt-lib/vitest.config.ts |
| Default environment | jsdom |
| Boundary test override | `@vitest-environment node` per file |

## Sampling Rate

| Checkpoint | Command | When |
|------------|---------|------|
| Per task | `cd packages/gantt-lib && npx vitest run src/core/scheduling/__tests__/execute.test.ts --reporter=verbose` | After each task |
| Per plan | `cd packages/gantt-lib && npx vitest run --reporter=verbose` | After each plan |
| Phase gate | `cd packages/gantt-lib && npx vitest run` | Before verify-work |
| Build gate | `cd packages/gantt-lib && npx tsc --noEmit && npx tsup --dts` | Final verification |

## Test Files

| File | Purpose | Plan |
|------|---------|------|
| `src/core/scheduling/__tests__/execute.test.ts` | Parity tests for 4 command APIs | 28-01 |
| `src/core/scheduling/__tests__/types.test.ts` | ScheduleTask type acceptance tests | 28-01 |
| `src/adapters/scheduling/__tests__/drag.test.ts` | UI adapter function tests after extraction | 28-02 |
| `src/core/scheduling/__tests__/boundary.test.ts` | Pure Node execution (no jsdom/React/DOM) | 28-03 |
| `src/__tests__/export-contract.test.ts` | Export map CJS/ESM verification | 28-03 |

## Phase Requirements to Test Map

| Req ID | Behavior | Test File | Type |
|--------|----------|-----------|------|
| FR-1 | UI functions extracted, core has no pixel refs | boundary.test.ts + drag.test.ts | unit |
| FR-1 | useTaskDrag still works after rewire | full test suite regression | integration |
| FR-2 | moveTaskWithCascade = manual composition result | execute.test.ts | parity |
| FR-2 | resizeTaskWithCascade (start/end) works | execute.test.ts | parity |
| FR-2 | recalculateTaskFromDependencies works | execute.test.ts | parity |
| FR-2 | recalculateProjectSchedule works | execute.test.ts | parity |
| FR-3 | cascade and lag-recompute documented separately | 14-headless-scheduling.md | manual |
| FR-4 | ScheduleTask accepts minimal shape | types.test.ts | unit |
| FR-5 | Documentation matches code | 14-headless-scheduling.md | manual |
| FR-6 | Export map works for CJS/ESM | export-contract.test.ts | contract |

## Parity Test Scenarios

| # | Scenario | Link Type | Business Days | Hierarchy |
|---|----------|-----------|---------------|-----------|
| 1 | move predecessor | FS | no | no |
| 2 | move predecessor | SS | no | no |
| 3 | move predecessor | FF | no | no |
| 4 | move predecessor | SF | no | no |
| 5 | move predecessor | FS neg lag | no | no |
| 6 | move predecessor | FS | yes | no |
| 7 | move parent | FS | no | yes |
| 8 | resize end | FS | no | no |
| 9 | resize start | FS | no | no |
| 10 | recalculate from deps | FS | no | no |
| 11 | recalculate project | FS chain | no | no |
| 12 | lag recalculation | FS | no | no |
