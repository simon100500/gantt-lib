# PRD: Headless Scheduling Core Extraction for `gantt-lib`

## Context

`gantt-lib` already contains the scheduling behavior that the product relies on. The current issue is not that the library logic is wrong by definition. The issue is that the logic lives inside a UI-oriented package and is therefore hard to reuse on the server.

Important constraint for this work:

- the current scheduling semantics of `gantt-lib` must be preserved
- the goal is to extract and package the pure logic so it can be duplicated or consumed by backend systems
- this PRD does not authorize a product-level behavior rewrite

Today the repo contains reusable scheduling pieces inside UI-adjacent modules such as dependency/date helpers, drag logic, and task list edit flows. Those pieces need to be reorganized into a clear headless core boundary.

## Product Goal

Make the current scheduling logic of `gantt-lib` easy to run outside the browser without changing what the library does today.

Success means:

- scheduling behavior remains the same for existing library consumers
- pure scheduling functions are extracted behind a stable headless API
- React, drag, DOM, and rendering concerns stop being mixed with schedule computation
- another repo such as `gantt-lib-mcp` can copy or directly consume the extracted logic with minimal friction

## Non-Goals

- no redesign of dependency semantics
- no behavior change from lag-recompute flows to a new default policy inside this repo unless explicitly requested later
- no forced migration of public chart API from `startDate/endDate`
- no broad component refactor unrelated to schedule extraction

## User Problems

1. Current schedule logic is hard to reuse on the server because it is mixed with UI code paths.
2. Downstream systems cannot safely mirror `gantt-lib` behavior without manually copying implementation details.
3. Fixes to dependency math risk landing in UI code only and not propagating to backend consumers.

## Functional Requirements

### 1. Define a headless scheduling boundary

Create an internal core module inside `gantt-lib` that contains only runtime-agnostic scheduling logic.

The headless core must include:

- task range math
- duration helpers
- lag normalization and lag calculation
- dependency date calculation for `FS`, `SS`, `FF`, `SF`
- dependency graph traversal
- cascade execution helpers
- cycle and dependency validation
- business-day and calendar-day date math

The headless core must not depend on:

- React
- DOM APIs
- pointer events
- task list rendering
- drag preview UI state
- viewport or scroll state

### 2. Preserve current behavior exactly

Extraction must preserve the behavior currently implemented in the library, including:

- current lag semantics
- current business-day handling
- current parent/child movement rules
- current cascade behavior used by drag flows
- current explicit lag recalculation helpers used by task-list edit flows

This repo should continue to support both of these existing logic families if they exist today:

- constraint/cascade execution
- explicit lag recalculation from edited dates

The extraction work is structural, not behavioral.

### 3. Introduce a stable internal API

Expose a stable internal API for headless scheduling so both library UI code and external consumers can rely on named entry points instead of importing deep utility files.

Required API categories:

- types
- date helpers
- dependency helpers
- schedule commands
- validation

Suggested command-level APIs:

- `moveTaskRange(...)`
- `resizeTaskRange(...)`
- `cascadeByLinks(...)`
- `recalculateIncomingLags(...)`
- `validateDependencies(...)`
- `calculateSuccessorDate(...)`

A higher-level wrapper may also be added if it reflects current behavior cleanly.

### 4. Rewire existing UI to use the extracted core

After extraction, existing UI code should import from the new headless boundary rather than from scattered utility internals.

At minimum this applies to:

- drag logic
- resize logic
- task-list date editing
- dependency editing flows
- validation paths

### 5. Enable downstream reuse

The extracted core should be structured so another repo can either:

- consume it as an internal package later
- or copy the scheduling folder with minimal UI baggage

The implementation should prefer small pure functions and explicit inputs over hook-driven stateful helpers.

## Technical Scope

### Current source areas to reorganize

The main candidates already visible in this repo are:

- `src/utils/dependencyUtils.ts`
- date utilities used by dependency math
- scheduling-related logic in `src/hooks/useTaskDrag.ts`
- schedule-editing paths in `src/components/TaskList/TaskListRow.tsx`

### Proposed structure

A suitable target shape is an internal module such as:

- `src/core/scheduling/types.ts`
- `src/core/scheduling/dateMath.ts`
- `src/core/scheduling/dependencies.ts`
- `src/core/scheduling/cascade.ts`
- `src/core/scheduling/commands.ts`
- `src/core/scheduling/index.ts`

Exact filenames may vary, but the separation should distinguish:

- pure date math
- dependency semantics
- graph traversal
- command execution
- compatibility wrappers

### Compatibility constraints

- keep current public chart props and task shape stable unless a separate migration is approved
- keep current tests passing with equivalent behavior
- avoid moving UI-only helper code into the headless module
- avoid introducing backend-specific assumptions into the library

## Rollout Plan

### Phase 1. Isolate pure logic

- identify pure scheduling functions already present
- move or re-export them behind a dedicated headless module
- remove any accidental UI coupling from those functions

### Phase 2. Rewire existing library code

- update drag flows to consume the extracted core
- update task-list edit flows to consume the extracted core
- keep existing public behavior unchanged

### Phase 3. Prepare external consumption

- add top-level exports or documented internal entry points
- document which pieces are safe for backend reuse
- add a note for downstream repos on how to mirror behavior safely

## Acceptance Criteria

- Existing `gantt-lib` scheduling behavior remains unchanged for current consumers.
- Schedule computation no longer depends on React or DOM APIs.
- Drag, resize, and task-list date edit flows use the shared headless module.
- The extracted module can be imported independently in tests without rendering the chart.
- A downstream repo can reuse the scheduling module without pulling in UI code.

## Test Requirements

Retain and expand tests for:

- `FS`, `SS`, `FF`, `SF`
- positive and negative lag
- business-day and calendar-day calculations
- cascade chains
- parent/child cascade behavior
- explicit incoming lag recalculation
- cycle detection
- task-list date edit regressions
- drag/resize regressions against current behavior

## Risks

- Some logic may be duplicated today across drag and task-list flows; extraction may expose inconsistencies that need explicit compatibility wrappers.
- Over-normalizing too early could accidentally change edge-case behavior.
- If external consumers start importing unstable internal files before a clean API exists, future refactors become harder.

## Implementation Rules

- Preserve current behavior first; improve architecture second.
- Prefer extraction and re-export over rewriting working math.
- Keep behavioral parity tests close to the extracted core.
- Treat this repo as the source of truth for scheduling semantics until shared packaging is introduced later.
