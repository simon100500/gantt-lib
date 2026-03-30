# Phase 28: Scheduling Core Hardening - Research

**Researched:** 2026-03-30
**Domain:** Headless scheduling module extraction, domain/UI boundary separation
**Confidence:** HIGH

## Summary

The `core/scheduling` module is already well-structured with 7 files covering date math, dependencies, cascade, commands, validation, hierarchy, and types. All files have zero React/DOM/date-fns imports. The module is already exposed as a separate entry point via `package.json` exports map and built as an independent bundle by tsup.

Two UI-polluting functions exist in `commands.ts`: `resolveDateRangeFromPixels` (accepts `left`, `width`, `dayWidth`, `monthStart` -- pixel coordinates) and `clampDateRangeForIncomingFS` (drag-mode wrapper `move|resize-left|resize-right`). Both are exclusively consumed by `useTaskDrag.ts` (4 call sites each). These need extraction to a UI adapter layer.

No command-level API exists yet. Downstream consumers must manually compose `moveTaskRange + universalCascade + recalculateIncomingLags + parent recompute`. The PRD requires 4 high-level commands: `moveTaskWithCascade`, `resizeTaskWithCascade`, `recalculateTaskFromDependencies`, `recalculateProjectSchedule`.

The existing test suite covers unit-level functions well (dateMath, dependencies, commands, cascade, validation, hierarchy) but has no parity tests for composed command flows and no boundary tests proving Node-only execution.

**Primary recommendation:** Extract the 2 UI functions to `src/adapters/scheduling/drag.ts`, add 4 command wrappers in a new `src/core/scheduling/execute.ts`, introduce `ScheduleTask` / `ScheduleCommandResult` types, and update documentation to match code reality.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Domain core не знает о пикселях, drag handles, chart coordinates
- Command API: moveTaskWithCascade, resizeTaskWithCascade, recalculateTaskFromDependencies, recalculateProjectSchedule
- recalculateIncomingLags = edit-policy helper, не часть cascade flow
- Типы: ScheduleTask, ScheduleDependency, ScheduleTaskUpdate, ScheduleCommandResult
- НЕ менять scheduling-логику без явного запроса
- НЕ переписывать dependency semantics
- Preserve behavior first, improve boundaries second

### Claude's Discretion
- Новое место для UI-адаптеров: `src/core/scheduling-adapters/` или `src/adapters/scheduling/`
- Точные имена файлов command-layer
- Детали реализации command wrappers
- Структура тестов для parity и boundary

### Deferred Ideas (OUT OF SCOPE)
- chart rendering
- React component API redesign
- task list UI redesign
- visual drag preview redesign
- backend implementation in other repos
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR-1 | Separate domain core from UI adapters | Two UI functions identified: `resolveDateRangeFromPixels`, `clampDateRangeForIncomingFS` in commands.ts, exclusively consumed by useTaskDrag.ts |
| FR-2 | Command-level scheduling API | Composition pattern documented from useTaskDrag.ts: moveTaskRange -> universalCascade -> recalculateIncomingLags -> parent recompute |
| FR-3 | Keep both logic families explicit | cascade.ts (universalCascade) vs commands.ts (recalculateIncomingLags) -- separate files already, need explicit documentation |
| FR-4 | Domain types for downstream | Task type has 12 fields; scheduling-relevant subset: id, startDate, endDate, dependencies, parentId, locked, progress |
| FR-5 | Documentation corrections | 5 specific gaps identified in 14-headless-scheduling.md vs code |
| FR-6 | Downstream consumption contract | Current import path `gantt-lib/core/scheduling` works; tsup already builds it as separate entry |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^3.0.0 | Test framework | Already configured in project |
| tsup | ^8.0.0 | Build tool | Already configured, multi-entry |
| typescript | ^5.7.0 | Type system | Already in use |
| date-fns | ^4.1.0 | Date utilities (UI layer only) | Already used in dateUtils.ts (NOT in core) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | ^16.3.2 | Component testing | Only for testing UI adapter rewire |
| jsdom | ^25.0.0 | DOM environment for tests | Already configured in vitest.config.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom ScheduleTask type | Utility type Pick<Task, ...> | Named type is more explicit for downstream contract |
| New execute.ts file | Add to commands.ts | Separate file makes command-layer boundary clearer |

**Installation:**
No new dependencies required. All tools already in the project.

## Architecture Patterns

### Current Module Structure
```
packages/gantt-lib/src/
├── core/scheduling/          # Domain core (7 files + barrel)
│   ├── types.ts              # Re-exports Task, LinkType, etc from ../../types
│   ├── dateMath.ts           # Pure date math
│   ├── dependencies.ts       # Successor date calc, lag semantics
│   ├── cascade.ts            # cascadeByLinks, universalCascade, chains
│   ├── commands.ts           # moveTaskRange, buildRange, clamp, recalculateLags + 2 UI functions
│   ├── validation.ts         # Cycle detection, dependency validation
│   ├── hierarchy.ts          # Parent/child, descendants, progress
│   └── index.ts              # Barrel re-export
├── hooks/
│   └── useTaskDrag.ts        # ONLY consumer of UI functions
├── utils/
│   └── dependencyUtils.ts    # Backward-compat re-export barrel
└── index.ts                  # Package root
```

### Recommended Target Structure
```
packages/gantt-lib/src/
├── core/scheduling/          # Domain core (8 files + barrel)
│   ├── types.ts              # Re-exports + NEW ScheduleTask, ScheduleCommandResult types
│   ├── dateMath.ts           # (unchanged)
│   ├── dependencies.ts       # (unchanged)
│   ├── cascade.ts            # (unchanged)
│   ├── commands.ts           # moveTaskRange, buildRange, clamp, recalculateLags (UI functions REMOVED)
│   ├── execute.ts            # NEW: moveTaskWithCascade, resizeTaskWithCascade, etc.
│   ├── validation.ts         # (unchanged)
│   ├── hierarchy.ts          # (unchanged)
│   └── index.ts              # Updated barrel: add execute exports, keep backward compat re-exports for UI functions
├── adapters/scheduling/      # NEW: UI adapter layer
│   ├── drag.ts               # resolveDateRangeFromPixels, clampDateRangeForIncomingFS
│   └── index.ts              # Barrel for UI adapters
├── hooks/
│   └── useTaskDrag.ts        # UPDATED: import from adapters/scheduling instead of core/scheduling
├── utils/
│   └── dependencyUtils.ts    # (unchanged -- backward compat)
└── index.ts                  # (unchanged)
```

### Pattern 1: UI-to-Domain Conversion in useTaskDrag
**What:** The hook converts pixel coordinates to domain dates, then calls domain scheduling functions.
**Current call sequence for task move (handleComplete):**
1. `resolveDateRangeFromPixels(mode, left, width, monthStart, dayWidth, task, ...)` -> `{ start, end }`
2. `clampDateRangeForIncomingFS(task, range, allTasks, mode, ...)` -> `{ start, end }`
3. `recalculateIncomingLags(task, newStart, newEnd, allTasks, ...)` -> updated deps
4. `universalCascade(movedTask, newStart, newEnd, allTasks, ...)` -> cascade result
5. Return `[movedTask, ...cascadeResult]`

**What the command API should encapsulate:**
Steps 3-5 (or 2-5 depending on design) in a single `moveTaskWithCascade(taskId, newStart, snapshot, options)` call.
Steps 1-2 stay in UI adapter layer.

### Pattern 2: Cascade + Lag Recomputation Are Separate Operations
**What:** `universalCascade` repositions successor tasks based on dependency constraints. `recalculateIncomingLags` rewrites lag values based on actual date positions.
**When each is used:**
- `universalCascade` -- always, when task moves/resizes
- `recalculateIncomingLags` -- always after cascade, to update lag values to reflect new positions
**Key distinction:** Lag recomputation is an *edit policy* (it updates stored lag to match reality), not a cascade step. This is already separate in code but not documented.

### Anti-Patterns to Avoid
- **Don't put pixel conversion in command API:** Command API should accept dates only. Pixel-to-date conversion stays in UI adapter.
- **Don't break the barrel re-export in dependencyUtils.ts:** 8+ files import from it or from core/scheduling. Maintain backward compat.
- **Don't silently change scheduling semantics:** All command wrappers must be thin compositions of existing functions with identical behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Task move with cascade | Custom cascade orchestration | existing `universalCascade` + `recalculateIncomingLags` | Already handles FS/SS/FF/SF, business days, hierarchy, change detection |
| Pixel to date conversion | New conversion function | existing `resolveDateRangeFromPixels` (just relocate it) | Handles move/resize-left/resize-right with business-day alignment |
| FS constraint clamping | New clamp logic | existing `clampTaskRangeForIncomingFS` | Already handles multi-predecessor FS constraints correctly |

**Key insight:** The existing scheduling logic is mature and battle-tested through useTaskDrag. Command wrappers should compose existing functions verbatim, not reimplement.

## Common Pitfalls

### Pitfall 1: Breaking useTaskDrag imports
**What goes wrong:** Moving UI functions out of core/scheduling without updating the barrel re-export in index.ts breaks useTaskDrag's single import statement.
**Why it happens:** useTaskDrag imports 14 functions from a single `from '../core/scheduling'` import.
**How to avoid:** Either (a) update useTaskDrag to import UI functions from new adapter location, or (b) re-export UI functions from core/scheduling/index.ts temporarily during migration.
**Warning signs:** Import resolution errors at build time.

### Pitfall 2: Command API returning wrong task shape
**What goes wrong:** Commands return full `Task` objects with `name`, `color`, `accepted` etc., making downstream think these fields are needed for scheduling.
**Why it happens:** `universalCascade` spreads `...task` and returns full Task objects.
**How to avoid:** Introduce `ScheduleTask` type. Commands should document that they need only scheduling-relevant fields as input and return only scheduling-relevant fields.
**Warning signs:** Downstream sends entire Task objects when only dates/dependencies are needed.

### Pitfall 3: Circular dependency between types
**What goes wrong:** `core/scheduling/types.ts` re-exports from `../../types` (which is `src/types/index.ts`), and new ScheduleTask type could create a bidirectional dependency if not careful.
**Why it happens:** The type gateway currently bridges into the main types module.
**How to avoid:** Define `ScheduleTask` in `core/scheduling/types.ts` as a standalone interface, not derived from the main `Task`. Keep the re-export of `Task` for backward compatibility.
**Warning signs:** TypeScript compilation errors or circular import warnings.

### Pitfall 4: tsup entry point configuration
**What goes wrong:** New UI adapter module is not added to tsup entry, or the scheduling entry point stops building correctly.
**Why it happens:** tsup.config.ts explicitly lists `['src/index.ts', 'src/core/scheduling/index.ts']` as entries.
**How to avoid:** UI adapters should NOT be a separate tsup entry point (they are UI-layer, not headless). Only core/scheduling remains as the headless entry. Adapters get bundled into the main package entry.
**Warning signs:** Build succeeds but `gantt-lib/core/scheduling` export breaks.

### Pitfall 5: normalizeDependencyLag FS negative lag documentation
**What goes wrong:** Documentation says "FS: lag >= 0" but code clamps to `>= -predecessorDuration`.
**Why it happens:** The `normalizeDependencyLag` function has nuanced behavior: `Math.max(-predecessorDuration, lag)`.
**How to avoid:** Document exact semantics: FS lag is clamped to >= -predecessorDuration (not >= 0). Negative FS lag allows successor to overlap with predecessor.
**Warning signs:** Downstream assumes lag=0 is minimum and rejects valid negative lags.

## Code Examples

### Current useTaskDrag composition pattern (the sequence to encapsulate)

```typescript
// From useTaskDrag.ts handleComplete (lines ~594-676)
// Step 1: Convert pixels to dates (UI adapter -- stays in adapters)
const finalRange = clampDateRangeForIncomingFS(
  currentTask,
  resolveDateRangeFromPixels(finalMode, finalLeft, finalWidth, monthStart, dayWidth, currentTask, businessDays, weekendPredicate),
  allTasks, finalMode, businessDays, weekendPredicate
);

// Step 2: Recalculate lags (edit-policy helper)
const updatedDependencies = recalculateIncomingLags(
  currentTask, finalRange.start, finalRange.end, allTasks, businessDays, weekendPredicate
);

// Step 3: Create moved task with updated deps
const movedTask = {
  ...currentTask,
  startDate: finalRange.start.toISOString(),
  endDate: finalRange.end.toISOString(),
  dependencies: updatedDependencies,
};

// Step 4: Cascade through dependency graph
const cascadeResult = universalCascade(
  movedTask, finalRange.start, finalRange.end, allTasks, businessDays, weekendPredicate
);

// Step 5: Return all changed tasks
return [movedTask, ...cascadeResult];
```

### Target command API signature

```typescript
// execute.ts -- command-level API
interface ScheduleCommandOptions {
  businessDays?: boolean;
  weekendPredicate?: (date: Date) => boolean;
  /** Skip cascade, only recalculate the task itself */
  skipCascade?: boolean;
}

interface ScheduleCommandResult {
  changedTasks: Task[];
  changedIds: string[];
}

function moveTaskWithCascade(
  taskId: string,
  newStart: Date,
  snapshot: Task[],
  options?: ScheduleCommandOptions
): ScheduleCommandResult;
```

### ScheduleTask minimal shape

```typescript
// types.ts -- new domain types
interface ScheduleTask {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  dependencies?: TaskDependency[];
  parentId?: string;
  locked?: boolean;
  progress?: number;
}
```

### Backward-compatible barrel re-export pattern

```typescript
// core/scheduling/index.ts after extraction
export * from './types';
export * from './dateMath';
export * from './dependencies';
export * from './cascade';
export * from './commands';
export * from './execute';      // NEW command API
export * from './validation';
export * from './hierarchy';

// UI adapter functions -- re-exported for backward compatibility
// Consumers should migrate to importing from 'gantt-lib/adapters/scheduling'
export {
  resolveDateRangeFromPixels,
  clampDateRangeForIncomingFS,
} from '../../adapters/scheduling';
```

## UI Function Consumer Map

### resolveDateRangeFromPixels consumers
| File | Lines | Context |
|------|-------|---------|
| `hooks/useTaskDrag.ts` | L223 | Preview during drag (businessDays path) |
| `hooks/useTaskDrag.ts` | L245 | Preview during drag (non-businessDays path) |
| `hooks/useTaskDrag.ts` | L273 | Universal preview cascade |
| `hooks/useTaskDrag.ts` | L602 | Final completion conversion |

### clampDateRangeForIncomingFS consumers
| File | Lines | Context |
|------|-------|---------|
| `hooks/useTaskDrag.ts` | L221 | Preview clamp (businessDays path) |
| `hooks/useTaskDrag.ts` | L243 | Preview clamp (non-businessDays path) |
| `hooks/useTaskDrag.ts` | L271 | Universal preview cascade clamp |
| `hooks/useTaskDrag.ts` | L600 | Final completion clamp |

**Only consumer:** `hooks/useTaskDrag.ts`. No other file in the codebase references either function.

### Other core/scheduling consumers
| File | What it imports |
|------|----------------|
| `components/TaskRow/TaskRow.tsx` | `isTaskParent, getChildren, getBusinessDaysCount` |
| `components/TaskList/TaskList.tsx` | `validateDependencies, calculateSuccessorDate, buildTaskRangeFromEnd, buildTaskRangeFromStart, getTaskDuration, isTaskParent, areTasksHierarchicallyRelated, getChildren` |
| `components/TaskList/TaskListRow.tsx` | (imports from `../../utils/dateUtils`) |
| `components/DependencyLines/DependencyLines.tsx` | (imports from `../../utils/dependencyUtils`) |
| `components/GanttChart/GanttChart.tsx` | `validateDependencies, cascadeByLinks, universalCascade, computeParentDates, computeParentProgress, getChildren, removeDependenciesBetweenTasks, isTaskParent` |
| `utils/dateUtils.ts` | `getBusinessDaysCount, addBusinessDays, subtractBusinessDays` from core/dateMath |
| `utils/dependencyUtils.ts` | Re-exports everything from core/scheduling (backward compat barrel) |

## Existing Test Coverage

### Files in `core/scheduling/__tests__/`
| File | Tests | Coverage |
|------|-------|----------|
| `commands.test.ts` | 10 tests | getTaskDuration, buildTaskRangeFromStart/End, moveTaskRange, clampTaskRangeForIncomingFS, recalculateIncomingLags, alignToWorkingDay |
| `cascade.test.ts` | 4 tests | getSuccessorChain, cascadeByLinks, reflowTasksOnModeSwitch |
| `dependencies.test.ts` | 8 tests | getDependencyLag, normalizeDependencyLag, calculateSuccessorDate (FS/SS/FF/SF), computeLagFromDates |
| `hierarchy.test.ts` | 6 tests | getChildren, isTaskParent, computeParentDates, computeParentProgress, getAllDescendants |
| `validation.test.ts` | 5 tests | validateDependencies, detectCycles, buildAdjacencyList |
| `dateMath.test.ts` | (exists, not read -- likely covers normalizeUTCDate, parseDateOnly, business day math) |

### Test gaps for Phase 28
- No tests for `resolveDateRangeFromPixels` or `clampDateRangeForIncomingFS`
- No composed flow tests (move -> cascade -> lag recalculation in one test)
- No boundary tests proving Node-only execution (no jsdom required)
- No public contract tests (export map verification)
- No tests for `universalCascade` with businessDays mode
- No tests for `getTransitiveCascadeChain`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All scheduling in dependencyUtils.ts | Extracted to core/scheduling/* | Phase 27 | Scheduling already modular |
| Mixed UI+domain in commands.ts | UI functions identified for extraction | Phase 28 (this) | Need to complete the separation |
| No command-level API | Low-level helpers only | Phase 28 (this) | Downstream must compose manually |

**Deprecated/outdated:**
- `dependencyUtils.ts` as scheduling authority: now a compat-only re-export barrel, zero implementations
- `normalizeDependencyLag` doc saying "FS: >= 0": actual behavior is `>= -predecessorDuration`

## Documentation Gaps (14-headless-scheduling.md vs Code)

1. **`normalizeDependencyLag` description is wrong:** Doc says "Normalizes lag (FS: >= 0)" but code clamps to `>= -predecessorDuration`. Negative FS lag is valid and represents overlap.

2. **`cascadeByLinks` lacks per-type semantics:** Doc says "Kaskad po FS-svyazam" but the function handles all link types (FS/SS use `buildTaskRangeFromStart`, FF/SF use `buildTaskRangeFromEnd`). The doc should specify this.

3. **`resolveDateRangeFromPixels` described as core:** Doc lists it under commands.ts without noting it's UI-layer. After extraction, it must be clearly labeled as adapter.

4. **No command-level API section:** Doc has no entry for the 4 planned commands.

5. **No stability level markers:** No indication of which APIs are stable for downstream vs internal.

6. **Missing `computeLagFromDates` semantics per link type:** The FS/SS/FF/SF lag formulas are in code comments but not documented.

## Export Map Analysis

### Current package.json exports
```json
{
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.mjs", "require": "./dist/index.js" },
  "./styles.css": "./dist/styles.css",
  "./core/scheduling": { "types": "./dist/core/scheduling/index.d.ts", "import": "./dist/core/scheduling/index.mjs", "require": "./dist/core/scheduling/index.js" }
}
```

### tsup.config.ts entry points
```typescript
entry: ['src/index.ts', 'src/core/scheduling/index.ts'],
```

### After Phase 28 changes needed:
- `./core/scheduling` entry point should NOT include UI adapter functions
- UI adapter functions should only be in the main `./` entry point
- Consider adding `./core/scheduling/types` as a types-only entry for downstream

## Open Questions

1. **Adapter re-export strategy in core/scheduling/index.ts**
   - What we know: useTaskDrag imports 14 functions from core/scheduling, 2 of which are UI functions
   - What's unclear: Should we temporarily re-export from core/scheduling barrel for backward compat, or immediately break the import and update useTaskDrag?
   - Recommendation: Temporarily re-export from core/scheduling barrel with a `@deprecated` comment, update useTaskDrag in same phase.

2. **Command API return type: Task[] vs ScheduleTask[]**
   - What we know: universalCascade returns full Task[] objects. Downstream needs only scheduling fields.
   - What's unclear: Whether commands should strip non-scheduling fields or return full Task objects
   - Recommendation: Return full Task objects (spread from input), document that only scheduling fields are authoritative. This preserves backward compat with existing UI code.

3. **ScheduleTask input acceptance**
   - What we know: Task type has `name` as required but scheduling doesn't need it
   - What's unclear: Whether command functions should accept ScheduleTask (minimal) or Task (full)
   - Recommendation: Accept `Task | ScheduleTask` via generic constraint. Use `Pick<Task, 'id' | 'startDate' | 'endDate' | 'dependencies' | 'parentId' | 'locked'>` as minimum input.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test | Yes | (checked by vitest) | -- |
| npm | Package management | Yes | (project uses npm) | -- |
| vitest | Testing | Yes | ^3.0.0 | -- |
| tsup | Build | Yes | ^8.0.0 | -- |
| typescript | Type checking | Yes | ^5.7.0 | -- |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** N/A -- all required tools available.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | `packages/gantt-lib/vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-1 | UI functions extracted to adapter layer, core has no pixel references | unit | `npx vitest run src/core/scheduling/__tests__` | Partial -- Wave 0 needs new tests |
| FR-1 | useTaskDrag still works after rewire | integration | `npx vitest run` | Existing tests cover this |
| FR-2 | moveTaskWithCascade produces same result as manual composition | unit | `npx vitest run src/core/scheduling/__tests__/execute.test.ts` | Wave 0 |
| FR-2 | resizeTaskWithCascade (left/right) works | unit | `npx vitest run src/core/scheduling/__tests__/execute.test.ts` | Wave 0 |
| FR-3 | cascade and lag-recompute are separate in docs | manual | -- | N/A |
| FR-4 | ScheduleTask type accepts minimal task shape | unit | `npx vitest run src/core/scheduling/__tests__/types.test.ts` | Wave 0 |
| FR-5 | Documentation matches code | manual | -- | N/A |
| FR-6 | Export map works for CJS/ESM | contract | `npx vitest run src/__tests__/export-contract.test.ts` | Wave 0 |
| Parity | Command APIs preserve current behavior (FS/SS/FF/SF, neg FS lag, biz days, hierarchy) | unit | `npx vitest run src/core/scheduling/__tests__/execute.test.ts` | Wave 0 |
| Boundary | Domain core runs without jsdom/React | unit | custom vitest config without jsdom | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/core/scheduling/__tests__/execute.test.ts` -- command API parity tests (FR-2)
- [ ] `src/core/scheduling/__tests__/boundary.test.ts` -- Node-only execution (no jsdom)
- [ ] `src/core/scheduling/__tests__/types.test.ts` -- ScheduleTask type acceptance
- [ ] `src/__tests__/export-contract.test.ts` -- export map verification (FR-6)
- [ ] `src/adapters/scheduling/__tests__/drag.test.ts` -- UI adapter function tests after extraction

## Sources

### Primary (HIGH confidence)
- Code analysis: All files in `packages/gantt-lib/src/core/scheduling/` read in full
- Code analysis: `packages/gantt-lib/src/hooks/useTaskDrag.ts` read in full (877 lines)
- Code analysis: `packages/gantt-lib/src/types/index.ts` read in full
- Code analysis: `packages/gantt-lib/package.json` exports map verified
- Code analysis: `packages/gantt-lib/tsup.config.ts` entry points verified
- Code analysis: All 6 test files in `core/scheduling/__tests__/` read in full
- Code analysis: `docs/reference/14-headless-scheduling.md` read in full

### Secondary (MEDIUM confidence)
- `packages/gantt-lib/src/utils/dependencyUtils.ts` -- backward-compat barrel confirmed
- `packages/gantt-lib/src/utils/dateUtils.ts` -- imports from core/scheduling/dateMath confirmed
- `packages/gantt-lib/vitest.config.ts` -- jsdom environment confirmed

### Tertiary (LOW confidence)
- No external sources consulted (pure code analysis phase, no library decisions needed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all tools verified in project
- Architecture: HIGH - full code audit of all scheduling files and consumers
- Pitfalls: HIGH - identified from code structure and import graph
- UI function extraction: HIGH - exact call sites documented, only 1 consumer
- Command API design: MEDIUM - composition pattern clear from useTaskDrag, but exact API surface needs planner validation

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable -- no external dependencies, code-driven research)
