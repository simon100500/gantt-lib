# Phase 27: core-refactor - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Source:** PRD Express Path (d:\Projects\gantt-lib\.planning\scheduling-core-extraction-prd.md)

<domain>
## Phase Boundary

Extract the current scheduling logic from UI-adjacent modules into a standalone headless core module that is runtime-agnostic (no React, no DOM). The extraction is structural, not behavioral — all existing scheduling semantics must be preserved exactly. After extraction, rewire existing UI code to import from the new core boundary.

The headless core must enable a downstream repo (e.g., `gantt-lib-mcp`) to copy or consume the extracted logic without pulling in any UI code.

</domain>

<decisions>
## Implementation Decisions

### Headless Scheduling Boundary (PRD Req 1)
- Create `src/core/scheduling/` module containing ONLY runtime-agnostic scheduling logic
- Must include: task range math, duration helpers, lag normalization/calculation, dependency date calculation (FS/SS/FF/SF), dependency graph traversal, cascade execution helpers, cycle/dependency validation, business-day and calendar-day date math
- Must NOT depend on: React, DOM APIs, pointer events, task list rendering, drag preview UI state, viewport/scroll state

### Behavior Preservation (PRD Req 2)
- Current lag semantics preserved exactly
- Current business-day handling preserved exactly
- Current parent/child movement rules preserved exactly
- Current cascade behavior used by drag flows preserved exactly
- Current explicit lag recalculation helpers used by task-list edit flows preserved exactly
- Both logic families preserved: constraint/cascade execution AND explicit lag recalculation from edited dates

### Stable Internal API (PRD Req 3)
- Expose named entry points: types, date helpers, dependency helpers, schedule commands, validation
- Command-level APIs: `moveTaskRange(...)`, `resizeTaskRange(...)`, `cascadeByLinks(...)`, `recalculateIncomingLags(...)`, `validateDependencies(...)`, `calculateSuccessorDate(...)`
- Higher-level wrapper may be added if it reflects current behavior cleanly
- Prefer small pure functions with explicit inputs over hook-driven stateful helpers

### Rewire Existing UI (PRD Req 4)
- Drag logic must import from new headless boundary
- Resize logic must import from new headless boundary
- Task-list date editing must import from new headless boundary
- Dependency editing flows must import from new headless boundary
- Validation paths must import from new headless boundary

### Downstream Reuse (PRD Req 5)
- Structure so another repo can consume as internal package later OR copy scheduling folder with minimal UI baggage
- Keep current public chart props and task shape stable
- Keep current tests passing with equivalent behavior

### Proposed Module Structure (PRD suggestion, may vary)
- `src/core/scheduling/types.ts`
- `src/core/scheduling/dateMath.ts`
- `src/core/scheduling/dependencies.ts`
- `src/core/scheduling/cascade.ts`
- `src/core/scheduling/commands.ts`
- `src/core/scheduling/index.ts`

### Source Areas to Reorganize (PRD identified)
- `src/utils/dependencyUtils.ts`
- Date utilities used by dependency math
- Scheduling-related logic in `src/hooks/useTaskDrag.ts`
- Schedule-editing paths in `src/components/TaskList/TaskListRow.tsx`

### Claude's Discretion
- Exact file split within `src/core/scheduling/` — group by cohesion
- Whether to use re-exports vs. direct moves
- Order of extraction (which functions first)
- Naming of intermediate helper functions
- Whether compatibility wrappers are needed at the boundary
- Test organization structure for the new core module

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scheduling Logic Source Files
- `packages/gantt-lib/src/utils/dependencyUtils.ts` — Core dependency math: calculateSuccessorDate, cascade, lag normalization, dependency validation
- `packages/gantt-lib/src/utils/dateUtils.ts` — Date math helpers: getMultiMonthDays, parseUTCDate, business-day calculations
- `packages/gantt-lib/src/hooks/useTaskDrag.ts` — Drag logic with scheduling-related move/resize calculations
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — Task-list date editing with explicit lag recalculation flows

### Supporting Files
- `packages/gantt-lib/src/types.ts` — Task, Dependency, GanttChart types
- `packages/gantt-lib/src/index.ts` — Public API surface

</canonical_refs>

<specifics>
## Specific Ideas

- PRD uses the term "headless" to mean "runtime-agnostic" — no React, no DOM, no browser APIs
- The extraction is explicitly NOT a behavior rewrite — "preserve current behavior first; improve architecture second"
- Two logic families coexist: constraint/cascade execution (drag flows) and explicit lag recalculation (task-list edit flows) — both must be preserved
- API should expose named entry points so consumers don't need to import deep utility internals
- `moveTaskRange`, `resizeTaskRange`, `cascadeByLinks`, `recalculateIncomingLags`, `validateDependencies`, `calculateSuccessorDate` are suggested command-level API names
- PRD rollout suggests 3 sub-phases: isolate pure logic → rewire UI → prepare external consumption

</specifics>

<deferred>
## Deferred Ideas

- No redesign of dependency semantics
- No behavior change from lag-recompute flows to a new default policy
- No forced migration of public chart API from `startDate/endDate`
- No broad component refactor unrelated to schedule extraction
- Actual packaging/publishing of the headless core as a separate npm package

</deferred>

---

*Phase: 27-core-refactor*
*Context gathered: 2026-03-30 via PRD Express Path*
