# Phase 29: Milestones Type Tasks - Research

**Researched:** 2026-04-11
**Domain:** Milestone task subtype for chart rendering, drag/edit rules, and scheduling compatibility
**Confidence:** HIGH

## User Constraints

No `29-CONTEXT.md` exists for this phase.

- Locked Decisions: none provided
- Claude's Discretion: full phase shaping within roadmap/backlog intent
- Deferred Ideas: none explicitly recorded for this phase

## Summary

The repo is ready for milestone support as an additive subtype, but the current implementation assumes every task is an inclusive date range with a rectangular bar, editable start/end dates, editable duration, optional progress fill, and resize handles. That assumption is spread across `TaskRow`, `useTaskDrag`, `geometry.ts`, `DependencyLines`, `TaskListRow`, docs, and tests. The scheduling core is mostly not the blocker: its date math already handles single-day tasks, and all four dependency types can work if a milestone is treated as a one-day point where start and finish are the same date.

The right boundary for Phase 29 is narrow: add milestone as a first-class task subtype, render it as a diamond on a single date, disable resize and duration editing for milestones, keep move/edit/dependency behavior consistent, and update docs/demos/tests. Do not broaden this into a generic task-type redesign, and do not change existing hierarchy semantics. Existing `parentId`-based parent/group behavior should remain the way projects are represented for now.

The biggest planning trap is over-scoping the public API. The backlog mentions `type: 'task' | 'milestone' | 'project'`, but only `milestone` has a concrete rendering/interaction need now. The planner must explicitly decide whether to add the full union now for forward-compatibility, or add only milestone now and defer `project` to a separate phase. Everything else in this phase depends on that decision.

**Primary recommendation:** Implement milestone as a single-date subtype with dedicated chart geometry and editing/drag rules, while keeping the scheduling core range-based and leaving project-type redesign out of scope.

## Project Constraints (from AGENTS.md)

- Respond in Russian.
- Follow instructions exactly; avoid unrequested scope growth.
- Prefer direct, action-oriented guidance over long explanation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | repo: `^19.0.0` | Component runtime | Existing library/UI code is already React-first |
| TypeScript | repo: `^5.7.0`, latest verified: `6.0.2` (modified 2026-04-01) | Public API typing and internal narrowing | All milestone behavior should be type-driven, not stringly-typed |
| vitest | repo: `^3.0.0`, latest verified: `4.1.4` (modified 2026-04-09) | Unit/integration tests | Existing test suite already covers chart/task-list/drag/core |
| tsup | repo: `^8.0.0`, latest verified: `8.5.1` (modified 2025-11-12) | Package build | No build-system change needed for milestone support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | repo/latest: `^4.1.0` / `4.1.0` (modified 2025-08-03) | Existing UI date helpers | Reuse only existing date utility paths; no new date library |
| @testing-library/react | repo/latest: `^16.3.2` / `16.3.2` (modified 2026-01-19) | UI behavior tests | Use for TaskRow, TaskListRow, and GanttChart milestone flows |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Additive milestone subtype | Separate `Milestone` data model | Adds needless branching across public API and demos |
| Keep range-based scheduling core | Zero-duration scheduling core | Would force wider rewrite of commands, cascade, and dependency math |
| Existing `parentId` hierarchy for projects | New project/group task system in same phase | Too broad; conflicts with “milestone now” goal |

**Installation:**
```bash
# No new packages required for Phase 29
```

## Architecture Patterns

### Recommended Project Structure
```text
packages/gantt-lib/src/
├── components/
│   ├── GanttChart/          # prop typing + orchestration
│   ├── TaskRow/             # milestone chart rendering branch
│   ├── TaskList/            # milestone editing/display branch
│   └── DependencyLines/     # milestone connection point geometry
├── hooks/
│   └── useTaskDrag.ts       # move-only milestone drag rules
├── utils/
│   └── geometry.ts          # milestone geometry helpers
├── core/scheduling/         # mostly unchanged; only type acceptance/tests if needed
└── __tests__/               # chart, task list, drag, geometry, dependency coverage
```

### Pattern 1: Milestone Is a Single-Date Task, Not a New Scheduling Engine
**What:** Milestone should still use `startDate` and `endDate`, but Phase 29 should treat it as valid only when both resolve to the same UTC day.
**When to use:** For data validation, task-list edits, demos, and drag output normalization.
**Recommendation:** Keep the core scheduling model inclusive-range based; normalize milestone edits so `endDate === startDate`.
**Example:**
```typescript
// Source: repo pattern from TaskRow.tsx + core/scheduling/dateMath.ts
type TaskType = 'task' | 'milestone' | 'project';

function isMilestoneTask(task: Task): boolean {
  return task.type === 'milestone';
}

function normalizeMilestoneDates(task: Task): Task {
  if (!isMilestoneTask(task)) return task;

  const start = typeof task.startDate === 'string'
    ? task.startDate.split('T')[0]
    : task.startDate.toISOString().split('T')[0];

  return { ...task, startDate: start, endDate: start };
}
```

### Pattern 2: Rendering Branch Lives in `TaskRow` and `geometry.ts`
**What:** Current chart rendering is entirely bar-based: `calculateTaskBar()` returns `{ left, width }`, `TaskRow` renders a rectangular bar, and dependency lines attach to left/right edges.
**When to use:** Timeline visuals, hover state, lock icon placement, labels, dependency endpoints.
**Recommendation:** Add milestone-specific geometry helpers instead of overloading the rectangle path. A diamond needs a center x-position plus a visual size, not a width-driven resizeable bar.
**Example:**
```typescript
// Source: repo pattern from geometry.ts
function calculateMilestoneGeometry(date: Date, monthStart: Date, dayWidth: number, size = 14) {
  const { left } = calculateTaskBar(date, date, monthStart, dayWidth);
  const centerX = left + dayWidth / 2;
  return {
    centerX,
    left: Math.round(centerX - size / 2),
    width: size,
    size,
  };
}
```

### Pattern 3: Milestone Is Move-Only in Timeline and Single-Date in TaskList
**What:** `useTaskDrag` currently only knows `move`, `resize-left`, and `resize-right`; `TaskListRow` always exposes start, end, and duration editors.
**When to use:** Interactive rules and editing UX.
**Recommendation:** Milestones should support move drag only. In the task list, either hide duration and make end mirror start, or keep the columns but disable independent duration/end editing for milestones.

### Pattern 4: Dependency Semantics Stay the Same, Endpoint Geometry Changes
**What:** `DependencyLines.tsx` derives endpoints from task left/right edges depending on link type, while scheduling core derives dates from dependency types and inclusive ranges.
**When to use:** Rendering arrows and reasoning about FS/SS/FF/SF with milestone endpoints.
**Recommendation:** Treat milestone start and finish as the same day in scheduling. For rendering, connect all milestone dependency links to the diamond center or to type-specific center-left/center-right points on the diamond, but do not rewrite dependency math.

### Anti-Patterns to Avoid
- **Do not redesign parent/project behavior in this phase:** current hierarchy already uses `parentId`, collapse state, and computed parent dates/progress.
- **Do not introduce zero-duration tasks in core scheduling:** the repo consistently uses inclusive one-day duration for same-day tasks.
- **Do not keep resize handles active on milestones:** it creates invalid milestone ranges immediately.
- **Do not let `TaskRow` infer milestone from `startDate === endDate` alone:** single-day tasks already exist and must remain rectangular tasks unless explicitly typed.

## Module Change Map

| Area | Modules | Required Change |
|------|---------|-----------------|
| Public typing | `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`, `packages/gantt-lib/src/types/index.ts`, `packages/gantt-lib/src/index.ts`, docs | Add `type` to public `Task` contract and document defaults |
| Timeline geometry | `packages/gantt-lib/src/utils/geometry.ts` | Add milestone geometry helper(s); keep existing `calculateTaskBar()` for normal tasks |
| Timeline rendering | `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx`, `TaskRow.css` | Render diamond, suppress progress fill/duration inside logic as needed, update lock/label placement |
| Drag/resize rules | `packages/gantt-lib/src/hooks/useTaskDrag.ts` | Force milestones into `move` mode, block resize branches, keep drop output single-date |
| Dependency line geometry | `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx` | Compute milestone endpoints differently from bar left/right edges |
| Task list display/editing | `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx`, `TaskList.tsx`, `columns/createBuiltInColumns.tsx`, `TaskList.css` | Add type-aware row behavior, duration/edit restrictions, maybe display type in name cell/context menu only |
| Scheduling/dependencies | `packages/gantt-lib/src/core/scheduling/*`, `utils/dependencyUtils.ts` | Mostly leave logic alone; add tests proving milestone one-day tasks behave correctly |
| Validation | `TaskListRow.tsx`, `GanttChart.tsx`, tests | Enforce milestone single-date invariant and reject invalid resize/edit flows |
| Docs | `docs/reference/02-task-interface.md`, `04-props.md`, likely `03-dependencies.md`, installation/examples | Add task type docs and milestone examples |
| Demo/data | `packages/website/src/data/sampleTasks.ts`, website demo components | Add milestone samples that prove chart/task-list/dependency behavior |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Milestone scheduling | Separate dependency engine for milestones | Existing inclusive one-day task math in core scheduling | Already supports same-day dates and all link types |
| Parent/project rows | New group/project row model | Existing `parentId` + `isTaskParent` + `computeParentDates` | Already shipped and hardened in earlier phases |
| Drag rules | Parallel milestone drag system | Existing `useTaskDrag` with type-aware mode gating | Keeps one preview/commit flow |
| Type-specific task list layout | New task list architecture | Existing resolved built-in column pipeline | Only cells need type-aware behavior |

**Key insight:** milestone support is mostly a UI contract problem on top of an already-working one-day scheduling model.

## Common Pitfalls

### Pitfall 1: Treating milestones as zero-width
**What goes wrong:** Diamond becomes impossible to click, drag, or connect dependency lines to.
**Why it happens:** Developers map “single date” to `width = 0`.
**How to avoid:** Use one-day scheduling semantics and separate visual geometry with a fixed diamond size.
**Warning signs:** Drag handle logic or hit testing breaks for milestones.

### Pitfall 2: Inferring milestone from same-day dates
**What goes wrong:** Existing normal one-day tasks start rendering as milestones.
**Why it happens:** Repo already allows one-day rectangular tasks.
**How to avoid:** Use explicit `task.type`.
**Warning signs:** Current sample or user tasks unexpectedly turn into diamonds after the phase.

### Pitfall 3: Allowing resize or free duration edits on milestones
**What goes wrong:** A milestone can accidentally become a 2+ day task while still typed as milestone.
**Why it happens:** Current UI always exposes resize handles and duration editors.
**How to avoid:** Milestone is move-only in chart and single-date in task list.
**Warning signs:** `type: 'milestone'` rows emit `startDate !== endDate`.

### Pitfall 4: Breaking dependency rendering while keeping scheduling correct
**What goes wrong:** Scheduling works, but arrows attach to invisible bar edges or overlap labels badly.
**Why it happens:** `DependencyLines.tsx` currently assumes every task has left/right bar edges from `calculateTaskBar()`.
**How to avoid:** Add explicit milestone endpoint geometry.
**Warning signs:** Arrows start or end in the wrong place for milestone tasks.

### Pitfall 5: Mixing milestone and parent/project semantics
**What goes wrong:** A task is both a milestone and a parent-like aggregate, with conflicting date/progress rules.
**Why it happens:** Backlog mentions both milestone and project types, while current hierarchy uses `parentId`-driven parents.
**How to avoid:** Lock the rule that milestone support does not redefine existing parent behavior in this phase.
**Warning signs:** Planner starts adding aggregate/project visual logic into the same wave.

## Code Examples

Verified repo-driven patterns:

### Type-Aware Drag Gating
```typescript
// Source: repo pattern from useTaskDrag.ts handleMouseDown
const isMilestone = task.type === 'milestone';

if (mode === 'resize-left' || mode === 'resize-right') {
  if (isMilestone || isTaskParent(taskId, allTasks)) {
    mode = 'move';
  }
}
```

### Type-Aware Task Row Rendering
```typescript
// Source: repo pattern from TaskRow.tsx branching on isParent/progress/locked
if (task.type === 'milestone') {
  return (
    <div
      className="gantt-tr-milestone"
      style={{ left: `${milestone.left}px`, width: `${milestone.size}px` }}
      onMouseDown={dragHandleProps.onMouseDown}
    />
  );
}

return <div className="gantt-tr-taskBar" />;
```

### Milestone Edit Normalization
```typescript
// Source: repo pattern from TaskListRow.tsx date editing handlers
function applyMilestoneDate(task: Task, nextDateIso: string): Task {
  return {
    ...task,
    startDate: nextDateIso,
    endDate: nextDateIso,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Every row is a rectangular inclusive-range task | Need explicit subtype-aware row rendering | Phase 29 | Milestones become visual points, not tiny bars |
| Parent/project rows are inferred from children only | Keep `parentId` hierarchy unchanged for now | Phases 19 and 28 | Milestone phase can stay narrow |
| Drag logic is generic bar move/resize | Need move-only override for milestone | Phase 29 | No scheduling-core rewrite required |

**Deprecated/outdated:**
- “Single-day task equals milestone” as a design shortcut
- “Project type must ship together with milestone type” as a planning assumption

## Recommended Wave Breakdown

### Wave 0: Contract Lock
- Lock the `Task.type` decision: `milestone` only now, or `task | milestone | project` union now with project behavior deferred.
- Lock milestone invariants: single date only, move-only on chart, no duration resize, dependency semantics unchanged.
- Add failing tests for public typing, TaskRow rendering, drag gating, task-list edit normalization, and dependency endpoints.

### Wave 1: Public API and Data Contract
- Update public `Task` typing and exports.
- Add type-aware normalization/validation helpers.
- Update docs reference for `Task` and `GanttChartProps`.

### Wave 2: Chart Rendering and Interaction
- Add milestone geometry helper(s).
- Implement diamond rendering in `TaskRow`.
- Update `useTaskDrag` for move-only milestone behavior.
- Update dependency line endpoint geometry for milestone tasks.

### Wave 3: Task List Editing and Demos
- Make `TaskListRow` type-aware for start/end/duration/progress editing.
- Decide whether duration is hidden, disabled, or shown as fixed `1д`.
- Add sample milestone tasks to website demo(s).

### Wave 4: Verification and Documentation Closeout
- Add/green integration tests across chart + task list + dependencies.
- Update reference docs and usage examples.
- Verify no regressions for regular one-day tasks, parent rows, and existing dependency flows.

## Open Questions

1. **Should the public union include `project` now?**
   - What we know: backlog says `type: 'task' | 'milestone' | 'project'`, but current runtime already models projects/parents through `parentId`.
   - What's unclear: whether Phase 29 should expose the full union for future-compatibility or keep the API tighter now.
   - Recommendation: planner must lock this first. My recommendation is either:
     - preferred minimal scope: add only `milestone` now, defer `project`;
     - preferred compatibility scope: add full union now, but document `project` as reserved/no new behavior yet.

2. **How should task list columns behave for milestones?**
   - What we know: current built-ins always show start, end, duration, progress, dependencies.
   - What's unclear: whether duration should be hidden, disabled, or displayed as fixed `1д`.
   - Recommendation: keep the current column structure; make end mirror start and make duration read-only for milestones. Do not redesign the column system.

3. **Can milestones have progress?**
   - What we know: current `Task` shape allows `progress`, and `TaskRow` visualizes it inside bars.
   - What's unclear: whether milestone should ignore progress visually or render some completion marker.
   - Recommendation: treat progress as allowed data but do not render milestone progress specially in this phase. Keep it neutral and document that milestone uses type-specific rendering.

4. **Can a milestone also be a parent task?**
   - What we know: current parents derive dates/progress from children and render as special aggregate bars.
   - What's unclear: whether `type: 'milestone'` with children should be rejected, ignored, or reinterpreted.
   - Recommendation: document milestone-parent combination as unsupported for Phase 29. Existing parent rendering wins if the task has children.

5. **What is the exact dependency anchor point on the diamond?**
   - What we know: scheduling semantics can stay unchanged; only SVG endpoint geometry changes.
   - What's unclear: whether to connect from the center point only, or from left/right midpoint of the diamond depending on link type.
   - Recommendation: use left/right midpoint of the diamond for consistency with current arrow direction rules.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js/npm | tests/build/version checks | Yes | available in workspace | — |
| Vitest | phase validation | Yes | repo `^3.0.0` | — |
| tsup | package build | Yes | repo `^8.0.0` | — |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (repo `^3.0.0`) |
| Config file | `packages/gantt-lib/vitest.config.ts` |
| Quick run command | `cd packages/gantt-lib && npm test -- src/__tests__/geometry.test.ts src/__tests__/dependencyLines.test.tsx src/__tests__/taskListDuration.test.tsx src/__tests__/useTaskDrag.test.ts` |
| Full suite command | `cd packages/gantt-lib && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PH29-1 | `Task` public API accepts milestone type | unit | `cd packages/gantt-lib && npm test -- src/core/scheduling/__tests__/types.test.ts src/__tests__/export-contract.test.ts` | Partial |
| PH29-2 | milestone renders as diamond, normal one-day task stays rectangular | component | `cd packages/gantt-lib && npm test -- src/__tests__/geometry.test.ts src/__tests__/dependencyLines.test.tsx` | Partial |
| PH29-3 | milestone cannot be resized, only moved | hook | `cd packages/gantt-lib && npm test -- src/__tests__/useTaskDrag.test.ts` | Yes |
| PH29-4 | task list edits keep milestone on one date | component | `cd packages/gantt-lib && npm test -- src/__tests__/taskListDuration.test.tsx` | Partial |
| PH29-5 | dependency arrows connect correctly to milestones | component | `cd packages/gantt-lib && npm test -- src/__tests__/dependencyLines.test.tsx` | Yes |
| PH29-6 | sample/demo data proves milestone usage | manual/integration | website smoke run | Wave 0 |

### Sampling Rate
- **Per task commit:** targeted Vitest files for geometry/drag/task-list/dependency lines
- **Per wave merge:** `cd packages/gantt-lib && npm test`
- **Phase gate:** full package test suite green plus manual demo check before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/gantt-lib/src/__tests__/taskRowMilestone.test.tsx` — dedicated milestone render assertions
- [ ] `packages/gantt-lib/src/__tests__/taskListMilestone.test.tsx` — task-list edit and display rules
- [ ] `packages/gantt-lib/src/__tests__/dependencyLinesMilestone.test.tsx` — milestone endpoint geometry
- [ ] `packages/gantt-lib/src/__tests__/useTaskDragMilestone.test.ts` — move-only drag behavior
- [ ] `packages/gantt-lib/src/__tests__/sampleMilestones.test.tsx` or equivalent demo coverage

## Sources

### Primary (HIGH confidence)
- Repo code: `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`
- Repo code: `packages/gantt-lib/src/types/index.ts`
- Repo code: `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx`
- Repo code: `packages/gantt-lib/src/components/TaskList/TaskList.tsx`
- Repo code: `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx`
- Repo code: `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx`
- Repo code: `packages/gantt-lib/src/hooks/useTaskDrag.ts`
- Repo code: `packages/gantt-lib/src/utils/geometry.ts`
- Repo code: `packages/gantt-lib/src/core/scheduling/types.ts`
- Repo code: `packages/gantt-lib/src/core/scheduling/commands.ts`
- Repo code: `packages/gantt-lib/src/core/scheduling/execute.ts`
- Repo code: `packages/gantt-lib/src/core/scheduling/hierarchy.ts`
- Repo code: `packages/gantt-lib/src/components/TaskList/columns/createBuiltInColumns.tsx`
- Repo docs: `docs/reference/02-task-interface.md`
- Repo docs: `docs/reference/04-props.md`
- Planning context: `.planning/backlog.md`, `.planning/phases/28-scheduling-core-hardening/28-RESEARCH.md`, `.planning/phases/28-scheduling-core-hardening/28-VERIFICATION.md`

### Secondary (MEDIUM confidence)
- npm registry: `vitest` latest `4.1.4` verified on 2026-04-11
- npm registry: `tsup` latest `8.5.1` verified on 2026-04-11
- npm registry: `typescript` latest `6.0.2` verified on 2026-04-11
- npm registry: `date-fns` latest `4.1.0` verified on 2026-04-11
- npm registry: `@testing-library/react` latest `16.3.2` verified on 2026-04-11

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing repo stack is clear and latest versions were verified
- Architecture: HIGH - milestone pressure points are explicit in current code structure
- Pitfalls: HIGH - current implementation assumptions are visible across rendering, drag, and task-list modules

**Research date:** 2026-04-11
**Valid until:** 2026-05-11
