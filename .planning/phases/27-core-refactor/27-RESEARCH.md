# Phase 27: core-refactor - Research

**Researched:** 2026-03-30
**Domain:** Module extraction / scheduling logic isolation
**Confidence:** HIGH

## Summary

The gantt-lib library currently has all scheduling logic (dependency math, cascade engine, date calculations, hierarchy propagation) in `src/utils/dependencyUtils.ts` and `src/utils/dateUtils.ts`. These files are already mostly runtime-agnostic — no React, no DOM, no hooks. The extraction is therefore a structural reorganization with minimal behavioral risk.

The tangle exists at the consumption boundary: `useTaskDrag.ts` (React hook with DOM/RAF) and `TaskListRow.tsx` (React component) contain inline scheduling calculations that should be extracted into pure functions in the headless core. These inline calculations duplicate logic that partially exists in dependencyUtils (move/resize/clamp) but are expressed differently (pixel→date coordinate transforms interleaved with scheduling math).

**Primary recommendation:** Create `src/core/scheduling/` as a new module boundary. Move dependencyUtils.ts functions and the relevant pure date math from dateUtils.ts into this module. Extract inline scheduling logic from useTaskDrag and TaskListRow into new pure command functions. Keep existing utils/ barrel export as a thin re-export layer for backward compatibility.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Create `src/core/scheduling/` module containing ONLY runtime-agnostic scheduling logic
- Must include: task range math, duration helpers, lag normalization/calculation, dependency date calculation (FS/SS/FF/SF), dependency graph traversal, cascade execution helpers, cycle/dependency validation, business-day and calendar-day date math
- Must NOT depend on: React, DOM APIs, pointer events, task list rendering, drag preview UI state, viewport/scroll state
- Current lag semantics preserved exactly
- Current business-day handling preserved exactly
- Current parent/child movement rules preserved exactly
- Current cascade behavior used by drag flows preserved exactly
- Current explicit lag recalculation helpers used by task-list edit flows preserved exactly
- Both logic families preserved: constraint/cascade execution AND explicit lag recalculation from edited dates
- Expose named entry points: types, date helpers, dependency helpers, schedule commands, validation
- Command-level APIs: `moveTaskRange(...)`, `resizeTaskRange(...)`, `cascadeByLinks(...)`, `recalculateIncomingLags(...)`, `validateDependencies(...)`, `calculateSuccessorDate(...)`
- Drag logic must import from new headless boundary
- Resize logic must import from new headless boundary
- Task-list date editing must import from new headless boundary
- Dependency editing flows must import from new headless boundary
- Validation paths must import from new headless boundary
- Structure so another repo can consume as internal package later OR copy scheduling folder with minimal UI baggage
- Keep current public chart props and task shape stable
- Keep current tests passing with equivalent behavior

### Claude's Discretion
- Exact file split within `src/core/scheduling/` — group by cohesion
- Whether to use re-exports vs. direct moves
- Order of extraction (which functions first)
- Naming of intermediate helper functions
- Whether compatibility wrappers are needed at the boundary
- Test organization structure for the new core module

### Deferred Ideas (OUT OF SCOPE)
- No redesign of dependency semantics
- No behavior change from lag-recompute flows to a new default policy
- No forced migration of public chart API from `startDate/endDate`
- No broad component refactor unrelated to schedule extraction
- Actual packaging/publishing of the headless core as a separate npm package
</user_constraints>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.x | Language | Already in project, tsup config |
| vitest | latest (project-dev) | Testing | Already configured with jsdom |
| date-fns | ^4.1.0 | Date parsing (parseISO, isValid) | Only used in dateUtils.ts line 1 — `parseUTCDate` |

### Supporting (no new deps needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsup | existing | Build | Bundle config already exports ESM+CJS |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsup sub-entry export | tsup dual build with separate core entry | Sub-entry is cleaner for "copy folder" use case but more complex config |

**Installation:** No new packages needed. This is a pure structural refactoring phase.

**Version verification:** All dependencies already installed in project.

## Architecture Patterns

### Current Source Layout
```
packages/gantt-lib/src/
├── types/index.ts              # LinkType, TaskDependency, DependencyError, ValidationResult, GanttDateRange, etc.
├── utils/
│   ├── index.ts                # Barrel: re-exports everything from all utils
│   ├── dependencyUtils.ts      # 1222 lines — core scheduling logic (PURE, no React/DOM)
│   ├── dateUtils.ts            # 710 lines — mixed: pure date math + UI helpers (formatting, grid spans)
│   ├── geometry.ts             # Pixel math — NOT scheduling, stays in utils
│   ├── hierarchyOrder.ts       # Reorder logic — imports from dependencyUtils+dateUtils
│   ├── expired.ts              # Expired task filter
│   └── taskListReorder.ts      # Row reorder logic
├── hooks/
│   ├── index.ts                # Barrel
│   └── useTaskDrag.ts          # 957 lines — React hook with inline scheduling calculations
├── components/
│   ├── GanttChart/             # Main chart — imports validateDependencies, cascadeByLinks, etc.
│   ├── TaskList/
│   │   ├── TaskList.tsx        # Imports scheduling functions for dependency validation
│   │   └── TaskListRow.tsx     # 2440 lines — inline scheduling in date edit handlers
│   └── TaskRow/TaskRow.tsx     # Imports isTaskParent, getChildren
├── filters/                    # Task filtering
└── __tests__/                  # 29 test files
```

### Proposed Target Layout
```
packages/gantt-lib/src/
├── core/
│   └── scheduling/
│       ├── types.ts            # Scheduling-specific type aliases (re-export from src/types or define local)
│       ├── dateMath.ts         # Pure date math: normalizeUTCDate, parseDateOnly, alignToWorkingDay, business-day ops
│       ├── dependencies.ts     # Dependency math: calculateSuccessorDate, computeLagFromDates, getDependencyLag, normalizeDependencyLag
│       ├── cascade.ts          # Cascade engine: universalCascade, cascadeByLinks, getSuccessorChain, getTransitiveCascadeChain
│       ├── commands.ts         # High-level commands: moveTaskRange, buildTaskRangeFromStart/End, clampTaskRangeForIncomingFS, recalculateIncomingLags
│       ├── validation.ts       # Validation: validateDependencies, detectCycles, buildAdjacencyList
│       ├── hierarchy.ts        # Hierarchy scheduling: getChildren, isTaskParent, computeParentDates, computeParentProgress, getAllDescendants, removeDependenciesBetweenTasks, findParentId
│       └── index.ts            # Barrel: re-exports all public APIs
├── utils/                      # Keep for backward compatibility — re-export from core/scheduling
│   ├── index.ts                # Updated: re-export from core/scheduling for backward compat
│   ├── dependencyUtils.ts      # Removed or turned into thin re-export
│   ├── dateUtils.ts            # Keep UI-specific helpers (formatDateRangeLabel, getMonthSpans, etc.)
│   ├── geometry.ts             # Unchanged
│   ├── hierarchyOrder.ts       # Updated imports
│   └── ...
├── hooks/useTaskDrag.ts        # Updated imports
├── components/                 # Updated imports
```

### Import Dependency Graph (Current)
```
types/index.ts (standalone)
    ↑
dateUtils.ts → (date-fns: parseISO, isValid)
    ↑
dependencyUtils.ts → dateUtils [getBusinessDaysCount, addBusinessDays, subtractBusinessDays]
    ↑
├── useTaskDrag.ts (React hook) → dependencyUtils [12 imports] + dateUtils [getBusinessDaysCount]
├── GanttChart.tsx (React component) → dependencyUtils [7 imports] + dateUtils [3 imports]
├── TaskListRow.tsx (React component) → dependencyUtils [8 imports] + dateUtils [6 imports]
├── TaskList.tsx (React component) → dependencyUtils [6 imports] + dateUtils [2 imports]
├── TaskRow.tsx (React component) → dependencyUtils [2 imports] + dateUtils [4 imports]
└── hierarchyOrder.ts → dependencyUtils [3 imports] + dateUtils [normalizeTaskDates]
```

### Pattern: Pure Function Extraction
**What:** Functions in useTaskDrag.ts and TaskListRow.tsx that perform scheduling math without React/DOM state
**When to use:** Any function that takes dates and returns dates without touching useState, refs, or DOM
**Example:**
```typescript
// Currently inline in useTaskDrag.ts (module-level, already pure):
function resolveDraggedRange(
  mode: 'move' | 'resize-left' | 'resize-right',
  left: number, width: number,
  monthStart: Date, dayWidth: number,
  task: Task, businessDays?: boolean,
  weekendPredicate?: (date: Date) => boolean
): { start: Date; end: Date }
// → Extract to core/scheduling/commands.ts as resolveDateRangeFromPixels(...)
```

### Pattern: Backward-Compatible Re-export
**What:** Keep `utils/dependencyUtils.ts` as a thin re-export from core
**When to use:** Every function that is currently imported by name from the old path
**Example:**
```typescript
// utils/dependencyUtils.ts (after extraction)
// Backward compatibility — all scheduling logic now lives in core/scheduling
export { calculateSuccessorDate, cascadeByLinks, /* ... */ } from '../core/scheduling';
```

### Anti-Patterns to Avoid
- **Moving UI helpers into core:** formatDateRangeLabel, getMonthSpans, getWeekBlocks are rendering helpers, NOT scheduling logic. They stay in dateUtils.ts.
- **Breaking the barrel export:** `src/index.ts` does `export * from './utils'`. Any change to utils/index.ts must preserve all exported names.
- **Moving date-fns dependency into core:** parseISO/isValid are only used in `parseUTCDate` which is UI-adjacent. The core should use native Date constructors only (as dependencyUtils already does).
- **Duplicating Task type:** Task is defined in `components/GanttChart/GanttChart.tsx`. Core should depend on a minimal Pick<> or interface, not import from React components.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Backward compat layer | New adapter pattern | Re-export barrel from old paths | All existing imports just work, zero migration |
| Task type for core | Duplicate Task interface | Pick<Task, 'id' | 'startDate' | 'endDate' | 'dependencies' | ...> or import from types/ | Single source of truth |
| Date normalization | New date utility | Extract existing normalizeUTCDate, parseDateOnly from dependencyUtils | Already battle-tested with UTC handling |

**Key insight:** The scheduling logic is already 95% pure. The main work is organizational (moving files) not algorithmic (extracting tangled logic). Only useTaskDrag.ts and TaskListRow.tsx have inline scheduling that needs extraction into named functions.

## Runtime State Inventory

> This is a structural extraction phase, not a rename/migration. No runtime state stored in databases, services, or OS registrations depends on source file locations.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — scheduling logic has no persistent storage | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | `dist/` output from tsup — will rebuild automatically | Rebuild after extraction (`pnpm build`) |

**Nothing found in any category:** Verified by codebase analysis — scheduling functions are stateless pure functions operating on Task arrays passed as arguments.

## Common Pitfalls

### Pitfall 1: Circular Dependency Between Core and Types
**What goes wrong:** Core imports Task from `components/GanttChart/GanttChart.tsx`, creating a cycle: component → core → component
**Why it happens:** Task type is co-located with the React component
**How to avoid:** Core imports types from `src/types/index.ts` only. If Task type is not there, create a minimal SchedulingTask type or move Task interface to `src/types/index.ts`.
**Warning signs:** TypeScript "Circular dependency" warnings during build

### Pitfall 2: Breaking Public API Surface
**What goes wrong:** Moving functions out of `utils/dependencyUtils.ts` breaks consumers who import `from 'gantt-lib'`
**Why it happens:** `src/index.ts` does `export * from './utils'` and `utils/index.ts` does `export * from './dependencyUtils'`
**How to avoid:** Keep `utils/dependencyUtils.ts` as a re-export barrel. Same for `utils/dateUtils.ts` — keep UI functions in place, re-export scheduling functions from core.
**Warning signs:** `pnpm build` fails, or downstream import errors

### Pitfall 3: date-fns Dependency Leaking Into Core
**What goes wrong:** core/scheduling/dateMath.ts imports `parseISO, isValid` from date-fns, making the core depend on date-fns
**Why it happens:** dateUtils.ts uses date-fns for parseUTCDate
**How to avoid:** The core already has its own `normalizeUTCDate()` and `parseDateOnly()` functions that use native Date constructors. Do not import date-fns in the core module.
**Warning signs:** core files contain `from 'date-fns'`

### Pitfall 4: Losing Test Coverage During Move
**What goes wrong:** Tests import from `../utils/dependencyUtils` which becomes a re-export barrel. Tests pass but test the barrel, not the core directly.
**Why it happens:** Lazy "just re-export and don't touch tests" approach
**How to avoid:** Create new test files in `src/core/scheduling/__tests__/` that import directly from core. Keep old tests passing via re-exports but add new tests against core paths.
**Warning signs:** No test files under `src/core/`

### Pitfall 5: parentId Type Safety Gap
**What goes wrong:** dependencyUtils uses `(t as any).parentId` throughout, which won't type-check cleanly in isolated core module
**Why it happens:** parentId was added in Phase 19 but not added to the core Task type
**How to avoid:** Include parentId in the scheduling task type definition (it's already used by getChildren, isTaskParent, etc.)
**Warning signs:** `as any` casts in core module files

## Code Examples

### Existing Pure Functions (direct move candidates)
```typescript
// dependencyUtils.ts — already pure, no changes needed
// These are the CORE scheduling functions:

export function calculateSuccessorDate(
  predecessorStart: Date, predecessorEnd: Date,
  linkType: LinkType, lag: number = 0,
  businessDays?: boolean, weekendPredicate?: (date: Date) => boolean
): Date

export function universalCascade(
  movedTask: Task, newStart: Date, newEnd: Date, allTasks: Task[],
  businessDays?: boolean, weekendPredicate?: (date: Date) => boolean
): Task[]

export function recalculateIncomingLags(
  task: Task, newStartDate: Date, newEndDate: Date, allTasks: Task[],
  businessDays?: boolean, weekendPredicate?: (date: Date) => boolean
): NonNullable<Task['dependencies']>

export function moveTaskRange(
  originalStart: string | Date, originalEnd: string | Date,
  proposedStart: Date, businessDays?: boolean,
  weekendPredicate?: (date: Date) => boolean, snapDirection?: 1 | -1
): { start: Date; end: Date }

export function buildTaskRangeFromStart(startDate: Date, duration: number, ...): { start: Date; end: Date }
export function buildTaskRangeFromEnd(endDate: Date, duration: number, ...): { start: Date; end: Date }
export function clampTaskRangeForIncomingFS(task, proposedStart, proposedEnd, allTasks, ...): { start: Date; end: Date }
export function computeLagFromDates(linkType, predStart, predEnd, succStart, succEnd, ...): number
export function validateDependencies(tasks: Task[]): ValidationResult
export function detectCycles(tasks: Task[]): { hasCycle: boolean; cyclePath?: string[] }
export function getChildren(parentId: string, tasks: Task[]): Task[]
export function isTaskParent(taskId: string, tasks: Task[]): boolean
export function computeParentDates(parentId: string, tasks: Task[]): { startDate: Date; endDate: Date }
export function computeParentProgress(parentId: string, tasks: Task[]): number
export function reflowTasksOnModeSwitch(sourceTasks, toBusinessDays, weekendPredicate): Task[]
```

### Inline Logic That Needs Extraction (from TaskListRow.tsx)
```typescript
// Currently inside DepChip component — handleLagChange callback (lines 409-472):
// This computes new task dates when lag changes via chip editing
// Pure scheduling math: normalizeDependencyLag → calculateSuccessorDate → buildTaskRange

// Currently inside handleStartDateChange (lines 1248-1303):
// Pure scheduling: alignToWorkingDay → buildTaskRangeFromStart → normalizeTaskDates
//                  → clampTaskRangeForIncomingFS → recalculateIncomingLags

// Currently inside handleEndDateChange (lines 1305-1360):
// Pure scheduling: alignToWorkingDay → buildTaskRangeFromEnd → normalizeTaskDates
//                  → clampTaskRangeForIncomingFS → recalculateIncomingLags
```

### Inline Logic That Needs Extraction (from useTaskDrag.ts)
```typescript
// resolveDraggedRange (lines 78-133):
// Converts pixel coords → date range. Pure function but takes pixel params.
// The date math portion is extractable: alignToWorkingDay + moveTaskRange + buildTaskRange

// clampDraggedRangeForIncomingFS (lines 135-155):
// Already delegates to dependencyUtils.clampTaskRangeForIncomingFS. Thin wrapper, stays in hook.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline cascade (Phase 7) | universalCascade engine (Phase 19) | Phase 19 | Unified BFS with 3 rules |
| Simple FS links | FS/SS/FF/SF with lag | Phase 10 | All link types supported |
| Calendar days only | Business-day-aware scheduling | Phase 24 | weekendPredicate parameter everywhere |
| Flat task list | Parent-child hierarchy | Phase 19 | Hierarchy propagation in cascade |

**Deprecated/outdated:**
- `cascadeByLinks`: Still exported and used in GanttChart.tsx but `universalCascade` is the newer, more complete engine. Both must be preserved per PRD.

## Environment Availability

> This is a code/config-only refactoring phase with no external dependencies.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| TypeScript | Build | ✓ | 5.x | — |
| vitest | Testing | ✓ | (project-dev) | — |
| tsup | Build | ✓ | existing | — |
| Node.js | Build/test | ✓ | 22.x | — |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** N/A

Step 2.6: No external dependencies identified — purely code reorganization.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest |
| Config file | `packages/gantt-lib/vitest.config.ts` |
| Quick run command | `cd packages/gantt-lib && pnpm test` |
| Full suite command | `cd packages/gantt-lib && pnpm test` |

### Phase Requirements → Test Map
| Behavior | Test Type | Test File | Automated Command | Status |
|----------|-----------|-----------|-------------------|--------|
| calculateSuccessorDate (FS/SS/FF/SF) | unit | `__tests__/dependencyUtils.test.ts` | `pnpm test dependencyUtils` | Existing |
| computeLagFromDates | unit | `__tests__/dependencyUtils.test.ts` | `pnpm test dependencyUtils` | Existing |
| universalCascade | unit | `__tests__/dependencyUtils.test.ts` | `pnpm test dependencyUtils` | Existing |
| validateDependencies + detectCycles | unit | `__tests__/dependencyUtils.test.ts` | `pnpm test dependencyUtils` | Existing |
| getSuccessorChain | unit | `__tests__/dependencyUtils.test.ts` | `pnpm test dependencyUtils` | Existing |
| recalculateIncomingLags | unit | `__tests__/dependencyUtils.test.ts` | `pnpm test dependencyUtils` | Existing |
| removeDependenciesBetweenTasks | unit | `__tests__/dependencyUtils.test.ts` | `pnpm test dependencyUtils` | Existing |
| findParentId | unit | `__tests__/dependencyUtils.test.ts` | `pnpm test dependencyUtils` | Existing |
| Business-day cascade preservation | unit | `__tests__/dependencyUtils.test.ts` | `pnpm test dependencyUtils` | Existing |
| dateUtils (parseUTCDate, businessDays) | unit | `__tests__/dateUtils.test.ts` | `pnpm test dateUtils` | Existing |
| useTaskDrag (integration) | unit | `__tests__/useTaskDrag.test.ts` | `pnpm test useTaskDrag` | Existing |
| hierarchy ordering | unit | `__tests__/hierarchy.test.ts` | `pnpm test hierarchy` | Existing |
| parent-child movement | unit | `__tests__/parentMoveChildren*.test.ts` | `pnpm test parentMove` | Existing |

### Sampling Rate
- **Per task commit:** `cd packages/gantt-lib && pnpm test`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/core/scheduling/__tests__/` — New test directory for core module tests
- [ ] Core scheduling integration test — verify all functions importable from `src/core/scheduling/`
- [ ] Backward compatibility smoke test — verify `import { calculateSuccessorDate } from '../utils/dependencyUtils'` still works

## Open Questions

1. **Task type location**
   - What we know: Task is defined in `components/GanttChart/GanttChart.tsx` (lines 25-65). Types `LinkType`, `TaskDependency`, `ValidationResult`, `DependencyError` are in `src/types/index.ts`.
   - What's unclear: Whether to move the full Task interface to `src/types/index.ts` or create a minimal `SchedulingTask` Pick type for core.
   - Recommendation: Define a `SchedulingTask` type alias in `core/scheduling/types.ts` using `Pick<Task, ...>` for fields actually used by scheduling functions. This avoids touching the public Task type. Alternatively, just add Task to `src/types/index.ts` and have core import from there — simpler but requires moving the interface.

2. **hierarchyOrder.ts dependency**
   - What we know: hierarchyOrder.ts imports `computeParentDates, computeParentProgress, isTaskParent` from dependencyUtils and `normalizeTaskDates` from dateUtils.
   - What's unclear: Should hierarchyOrder.ts move to core/scheduling or stay in utils?
   - Recommendation: hierarchyOrder is about task reordering, not scheduling. Keep it in utils, update its imports to point at core/scheduling.

3. **GanttChart.tsx direct imports of cascade functions**
   - What we know: GanttChart.tsx imports `validateDependencies, cascadeByLinks, universalCascade, computeParentDates, computeParentProgress, getChildren, removeDependenciesBetweenTasks, isTaskParent` directly from dependencyUtils.
   - What's unclear: Should GanttChart import from core/scheduling directly or through the backward-compat barrel?
   - Recommendation: Import from core/scheduling directly — GanttChart is internal code, not a public consumer. The backward-compat barrel is for external consumers.

## Sources

### Primary (HIGH confidence)
- Source code analysis of `packages/gantt-lib/src/utils/dependencyUtils.ts` — 1222 lines, all scheduling logic
- Source code analysis of `packages/gantt-lib/src/utils/dateUtils.ts` — 710 lines, date math + UI helpers
- Source code analysis of `packages/gantt-lib/src/hooks/useTaskDrag.ts` — 957 lines, React hook
- Source code analysis of `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — 2440 lines, React component
- Import dependency graph traced via grep across all source files

### Secondary (MEDIUM confidence)
- Test file analysis: `__tests__/dependencyUtils.test.ts` (723 lines) — comprehensive unit coverage of scheduling logic
- `__tests__/useTaskDrag.test.ts` — integration tests for drag behavior

### Tertiary (LOW confidence)
- None — all findings based on direct source analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, existing tooling
- Architecture: HIGH — full import dependency graph mapped, all consumers identified
- Pitfalls: HIGH — based on concrete analysis of existing code patterns
- Extraction boundary: HIGH — dependencyUtils is already 95% pure

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable — structural refactoring, not API-dependent)

## Detailed Function Inventory

### Functions to MOVE to core/scheduling (from dependencyUtils.ts)

**dateMath.ts candidates (low-level date operations):**
- `normalizeUTCDate(date)` — internal, used everywhere
- `parseDateOnly(date)` — internal, used in getTaskDuration, clampTaskRangeForIncomingFS
- `getBusinessDayOffset(fromDate, toDate, weekendPredicate)` — internal, used in computeLagFromDates
- `shiftBusinessDayOffset(date, offset, weekendPredicate)` — internal, used in calculateSuccessorDate
- `DAY_MS` constant — used across dependencyUtils

**Also from dateUtils.ts (pure date math, not UI):**
- `getBusinessDaysCount(startDate, endDate, weekendPredicate)` — pure, no React/DOM
- `addBusinessDays(startDate, businessDays, weekendPredicate)` — pure
- `subtractBusinessDays(endDate, businessDays, weekendPredicate)` — pure

**dependencies.ts candidates:**
- `getDependencyLag(dep)` — simple accessor
- `normalizeDependencyLag(linkType, lag, ...)` — FS lag clamping
- `calculateSuccessorDate(predecessorStart, predecessorEnd, linkType, lag, ...)` — core date calc
- `computeLagFromDates(linkType, predStart, predEnd, succStart, succEnd, ...)` — reverse calc

**cascade.ts candidates:**
- `cascadeByLinks(movedTaskId, newStart, newEnd, allTasks, skipChildCascade)` — older cascade engine
- `universalCascade(movedTask, newStart, newEnd, allTasks, businessDays, weekendPredicate)` — unified engine
- `getSuccessorChain(draggedTaskId, allTasks, linkTypes)` — BFS chain builder
- `getTransitiveCascadeChain(changedTaskId, allTasks, firstLevelLinkTypes)` — transitive closure
- `reflowTasksOnModeSwitch(sourceTasks, toBusinessDays, weekendPredicate)` — mode switch

**commands.ts candidates:**
- `getTaskDuration(startDate, endDate, businessDays, weekendPredicate)` — duration calculator
- `buildTaskRangeFromStart(startDate, duration, ...)` — range builder
- `buildTaskRangeFromEnd(endDate, duration, ...)` — range builder
- `moveTaskRange(originalStart, originalEnd, proposedStart, ...)` — move command
- `clampTaskRangeForIncomingFS(task, proposedStart, proposedEnd, allTasks, ...)` — constraint clamp
- `recalculateIncomingLags(task, newStartDate, newEndDate, allTasks, ...)` — lag recompute
- `alignToWorkingDay(date, direction, weekendPredicate)` — weekend snap

**validation.ts candidates:**
- `buildAdjacencyList(tasks)` — graph builder
- `detectCycles(tasks)` — cycle detection
- `validateDependencies(tasks)` — full validation

**hierarchy.ts candidates:**
- `getChildren(parentId, tasks)`
- `isTaskParent(taskId, tasks)`
- `computeParentDates(parentId, tasks)`
- `computeParentProgress(parentId, tasks)`
- `removeDependenciesBetweenTasks(taskId1, taskId2, tasks)`
- `findParentId(taskId, tasks)`
- `getAllDescendants(parentId, tasks)`
- `getAllDependencyEdges(tasks)`

### Functions to KEEP in dateUtils.ts (UI-specific)
- `parseUTCDate(date)` — uses date-fns parseISO
- `getMonthDays(date)` — UI grid rendering
- `getDayOffset(date, monthStart)` — UI pixel math
- `isToday(date)` — UI indicator
- `isWeekend(date)` — default predicate (but core can reference it)
- `createDateKey(date)` — Set lookup helper
- `createCustomDayPredicate(config)` — UI prop processing
- `getMultiMonthDays(tasks)` — grid range calculation
- `getMonthSpans(dateRange)` — header rendering
- `formatDateLabel(date)` — display formatting
- `formatDateRangeLabel(start, end)` — display formatting
- `getWeekBlocks(days)` / `getWeekSpans(days)` — week view
- `getMonthBlocks(days)` / `getYearSpans(days)` — month view
- `normalizeTaskDates(startDate, endDate)` — date normalization (used by both UI and hierarchyOrder)
- `CustomDayConfig`, `CustomDayPredicateConfig` types — UI prop types
- `WeekBlock`, `WeekSpan`, `MonthBlock`, `YearSpan` types — UI types

### Consumers to UPDATE (import path changes)

| File | Current Import | New Import |
|------|---------------|------------|
| `hooks/useTaskDrag.ts` | `from '../utils/dependencyUtils'` (12 functions) | `from '../core/scheduling'` |
| `hooks/useTaskDrag.ts` | `from '../utils/dateUtils'` (1 function) | `from '../core/scheduling'` |
| `components/GanttChart/GanttChart.tsx` | `from '../../utils/dependencyUtils'` (7 functions) | `from '../../core/scheduling'` |
| `components/GanttChart/GanttChart.tsx` | `from '../../utils/dateUtils'` (3 imports) | Split: core for business, utils for UI |
| `components/TaskList/TaskList.tsx` | `from '../../utils/dependencyUtils'` (7 functions) | `from '../../core/scheduling'` |
| `components/TaskList/TaskList.tsx` | `from '../../utils/dateUtils'` (2 imports) | Keep dateUtils imports (UI helpers) |
| `components/TaskList/TaskListRow.tsx` | `from '../../utils/dependencyUtils'` (8 functions) | `from '../../core/scheduling'` |
| `components/TaskList/TaskListRow.tsx` | `from '../../utils/dateUtils'` (6 imports) | Split: core for business, utils for UI |
| `components/TaskRow/TaskRow.tsx` | `from '../../utils/dependencyUtils'` (2 functions) | `from '../../core/scheduling'` |
| `components/TaskRow/TaskRow.tsx` | `from '../../utils/dateUtils'` (4 imports) | Keep dateUtils (UI helpers) |
| `components/TodayIndicator/TodayIndicator.tsx` | `from '../../utils/dateUtils'` (1 import) | Keep (UI helper) |
| `components/TimeScaleHeader/TimeScaleHeader.tsx` | `from '../../utils/dateUtils'` (8 imports) | Keep (UI rendering helpers) |
| `components/ui/Calendar.tsx` | `from '../../utils/dateUtils'` (1 import) | Keep (UI component) |
| `utils/hierarchyOrder.ts` | `from './dependencyUtils'` (3 functions) | `from '../core/scheduling'` |
| `utils/hierarchyOrder.ts` | `from './dateUtils'` (1 import) | Keep (normalizeTaskDates is UI-adjacent) |
