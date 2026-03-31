# PRD: Phase 28 Follow-up — Scheduling Core Contract Closure

## Context

Phase 28 materially improved `gantt-lib` scheduling architecture, but review found several contract gaps between:

- implementation
- documentation
- verification report
- downstream-consumer expectations

The extracted `core/scheduling` is directionally correct, but it is not yet safe to describe as fully closed and server-ready without qualification.

This follow-up PRD exists to close the remaining contract mismatches before the library is treated as authoritative scheduling infrastructure for external consumers such as `gantt-lib-mcp`.

## Why This Follow-up Exists

The review identified four concrete gaps:

1. Command APIs still accept `Task[]`, while docs and verification imply a minimal `ScheduleTask` contract is sufficient.
2. Export contract tests validate source-level barrels, but not actual package `exports` behavior from built artifacts.
3. Documentation recommends adapter import paths that are not exported in `package.json`.
4. `resizeTaskWithCascade(anchor='start')` semantics are inconsistent between comments, docs, and implementation.

These are not broad architectural failures. They are contract-quality problems. They matter because downstream reuse depends more on precise contracts than on internal code organization.

## Product Goal

Make `gantt-lib` scheduling contracts exact, externally consumable, and test-proven.

Success means:

- downstream consumers can rely on a real minimal scheduling input contract
- documentation does not recommend unsupported import paths
- package-level exports are verified from build output, not inferred from source imports
- command semantics are documented exactly as implemented, or implementation is corrected to match the intended semantics
- Phase 28 can be considered complete without qualification after these fixes

## Non-Goals

- no new scheduling behavior
- no new dependency semantics
- no rewrite of cascade engine
- no UI redesign
- no backend implementation work in other repos

## Problems To Solve

### Problem 1. Minimal contract is declared, but not truly usable

`ScheduleTask` is documented as the minimal downstream scheduling shape, but command functions still take `Task[]`, where `Task` requires `name`.

Impact:

- external consumers cannot use the advertised minimal shape without type assertions or fake fields
- docs overstate the maturity of the API
- verification overstates FR-4 closure

### Problem 2. Export contract is not actually verified at package boundary

Current tests import source files like `../core/scheduling`, not the built package entrypoints defined by `package.json`.

Impact:

- CJS/ESM compatibility claims are not truly proven
- `exports` map regressions could ship undetected
- verification overstates export contract coverage

### Problem 3. Adapter import path is undocumented incorrectly

Docs instruct consumers to import via `adapters/scheduling`, but that path is not exported publicly from `package.json`.

Impact:

- external users may try an unsupported path
- docs create a broken public contract

### Problem 4. Resize semantics are inconsistent

For `resizeTaskWithCascade(anchor='start')`, the implementation keeps the original end date and changes the start date. Comments/docs imply duration-preserving recalculation.

Impact:

- downstream implementers can encode the wrong behavior
- verification claims “docs match code” are too strong

## Functional Requirements

### FR-1. Make command APIs truly accept minimal scheduling input

Introduce one of two explicit approaches and choose one in implementation:

#### Option A. Command APIs accept `ScheduleTask[]`

Update:

- `moveTaskWithCascade`
- `resizeTaskWithCascade`
- `recalculateTaskFromDependencies`
- `recalculateProjectSchedule`

so they operate on `ScheduleTask[]` rather than `Task[]`.

Requirements:

- minimal scheduling shape must be sufficient at compile time
- implementation may still return richer `Task`-compatible objects if desired
- any fields not required for scheduling must remain optional or pass-through

#### Option B. Keep `Task[]`, but stop advertising `ScheduleTask` as executable input

If this path is chosen, then:

- docs must explicitly state that `ScheduleTask` is informational only
- verification must no longer claim minimal contract closure
- recommended downstream input shape must include required `Task` fields

Recommended path: Option A.

### FR-2. Define a precise result contract

Clarify whether `ScheduleCommandResult.changedTasks` contains:

- only authoritative scheduling fields, or
- full pass-through task objects

Documentation and types must state this explicitly.

If full task objects remain the result type:

- clarify that non-scheduling fields are pass-through only
- document which fields are authoritative after command execution

### FR-3. Verify actual package export boundaries

Add package-boundary tests that validate built output, not only source-level imports.

Required checks:

- `gantt-lib/core/scheduling` resolves after build
- `require('gantt-lib/core/scheduling')` works
- `import('gantt-lib/core/scheduling')` works
- exported command-level APIs exist in built artifact
- type declarations are emitted for exported entrypoints

These tests must run against `dist` or an equivalent built-package view.

### FR-4. Resolve adapter public path policy

Choose one explicit public contract:

#### Option A. Adapters are internal-only

Then:

- remove any doc language telling external consumers to import adapters directly
- keep only deprecated re-export path through `core/scheduling`
- clearly mark adapters as internal implementation detail

#### Option B. Adapters are public

Then:

- add `./adapters/scheduling` to `package.json.exports`
- test it explicitly
- document it as public but non-core

Recommended path: Option A, unless there is a clear external use case.

### FR-5. Make resize semantics exact

Resolve the `anchor='start'` mismatch by choosing one truth:

#### Option A. Current implementation is correct

Then update:

- JSDoc
- API docs
- verification report language

to state that:

- `anchor='start'` moves start while preserving end
- `anchor='end'` moves end while preserving duration from end anchor logic

#### Option B. Current docs are correct

Then implementation must change to actually preserve duration when resizing from start.

Recommended path: Option A, because it is the least disruptive and matches current tests.

### FR-6. Correct verification artifacts

Update Phase 28 verification so that it no longer overclaims what is proven.

Required corrections:

- if minimal input contract is not yet fixed, verification must say so
- export contract must distinguish source-barrel tests from package-export tests
- documentation-match claims must reflect actual semantics precisely

This is not cosmetic. Verification must remain trustworthy.

## Technical Scope

### In Scope

- `packages/gantt-lib/src/core/scheduling/types.ts`
- `packages/gantt-lib/src/core/scheduling/execute.ts`
- `packages/gantt-lib/src/core/scheduling/__tests__/*`
- `packages/gantt-lib/src/__tests__/export-contract.test.ts`
- `packages/gantt-lib/package.json`
- `docs/reference/14-headless-scheduling.md`
- `D:\Projects\gantt-lib\.planning\phases\28-scheduling-core-hardening\28-VERIFICATION.md`

### Out of Scope

- cascade algorithm rewrite
- adapter architecture rewrite beyond public/private contract clarification
- backend consumer implementation

## Acceptance Criteria

- A downstream consumer can use the documented scheduling input contract without fake required fields or type assertions.
- The recommended import paths in docs are actually supported by the package exports.
- Built-package tests prove the `core/scheduling` entrypoint works in both import and require modes.
- `resizeTaskWithCascade(anchor='start')` semantics are described consistently across code, tests, docs, and verification.
- Phase verification no longer overstates what is proven.

## Test Requirements

### 1. Contract tests

Add tests for:

- minimal scheduling input shape acceptance
- command API execution with minimal-shape tasks
- result contract shape

### 2. Package export tests

Add tests that run after build against the built package entrypoints.

Minimum required scenarios:

- ESM import of `gantt-lib/core/scheduling`
- CJS require of `gantt-lib/core/scheduling`
- failure or success of adapter path according to chosen public policy

### 3. Documentation consistency tests or checks

At minimum, add reviewable checks or assertions that ensure:

- docs do not mention unsupported public import paths
- resize semantics in docs align with tested behavior

## Implementation Notes

- Prefer closing the type/API contract rather than weakening the docs unless absolutely necessary.
- If a field like `name` is only needed for UI consumers, it should not block downstream scheduling usage.
- If adapter paths remain internal, docs should say so explicitly and stop recommending them publicly.
- The verification report should be treated as an auditable artifact, not marketing copy.

## Final Outcome

After this PRD is complete, `gantt-lib/core/scheduling` should be not just architecturally cleaner, but contractually trustworthy for downstream server reuse.
