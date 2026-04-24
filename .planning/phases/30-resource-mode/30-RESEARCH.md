# Phase 30: resource-mode - Research

**Researched:** 2026-04-24 [VERIFIED: system date]
**Domain:** React/TypeScript resource timeline renderer behind existing GanttChart facade [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md]
**Confidence:** HIGH [VERIFIED: repo inspection + PRD + npm registry]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Public API
- Add `GanttChartMode = 'gantt' | 'resource-planner'`.
- Treat omitted `mode` as `'gantt'`.
- Keep the current `<GanttChart tasks={tasks} />` API valid.
- Support `<GanttChart mode="gantt" tasks={tasks} />` as equivalent to the current API.
- Add `<GanttChart mode="resource-planner" resources={resources} onResourceItemMove={handleResourceItemMove} />`.
- Export the specialized renderer as `ResourceTimelineChart`, while documenting `GanttChart mode` as the primary path.
- Convert `GanttChartProps` into a discriminated union of current gantt-mode props and resource-planner props.

### Resource Data Types
- Add `ResourceTimelineResource<TItem>` with `id`, `name`, and `items`.
- Add `ResourceTimelineItem` with `id`, `resourceId`, optional `taskId`, `title`, optional `subtitle`, `startDate`, `endDate`, optional `color`, optional `locked`, and optional `metadata`.
- Add `ResourceTimelineMove<TItem>` with `item`, `itemId`, `fromResourceId`, `toResourceId`, `startDate`, and `endDate`.
- Add `ResourcePlannerChartProps<TItem>` with `mode: 'resource-planner'`, `resources`, optional sizing props, `readonly`, `renderItem`, `getItemClassName`, and `onResourceItemMove`.

### Rendering Behavior
- Left column shows `resource.name`.
- Right side shows a calendar grid over the shared date range across all resource items.
- Date range is based on min `startDate` and max `endDate` across items and should reuse the existing multi-month date approach where practical.
- Items inside a resource row are laid out into lanes.
- Resource row height equals `max(1, laneCount) * laneHeight + verticalPadding`.
- Empty resource rows remain visible with one-lane height.
- The default item bar renders `title`, `subtitle`, and a date label.
- `renderItem` overrides the item bar inner content.
- `getItemClassName` appends custom per-item classes for conflict, invalid, or domain-specific states.

### Lane Layout Algorithm
- Add a pure `layoutResourceTimelineItems` utility.
- Parse dates through existing UTC/date helpers.
- Invalid-date items must not break the whole chart. Exclude them from normal timeline layout and return diagnostics or render an invalid row state.
- Sort items by `startDate`, then `endDate`, then `id`.
- Place each item into the first lane where it does not overlap the last item in that lane.
- Use inclusive overlap semantics: `a.start <= b.end && b.start <= a.end`.
- Return a stable model including `laneIndex`, `left`, `width`, `resourceRowTop`, and `resourceRowHeight`.

### Drag and Drop
- Horizontal drag moves item dates while preserving duration.
- Horizontal drag snaps to day columns.
- During drag, render a preview bar position.
- On mouseup, call `onResourceItemMove`.
- Vertical drag resolves the target resource row from the current Y coordinate.
- Drop outside resource rows cancels the move and does not call the callback.
- Drop on another resource calls the callback with `fromResourceId` and `toResourceId`.
- Overlap on target resource is allowed; the next layout pass assigns the item to a free or new lane.
- `readonly` disables all resource item drag interactions.
- `item.locked` disables drag for that item.

### Explicitly Disabled in Resource Mode
- Do not render or apply `DependencyLines`.
- Do not run dependency validation or cascade.
- Do not apply hierarchy indentation, collapse, or parent date/progress aggregation.
- Do not render task list editing.
- Do not apply task reorder semantics.
- If resource bar links are needed later, add a dedicated lightweight resource overlay instead of reusing the current dependency engine directly.

### Styling
- Reuse existing CSS variables for font, grid lines, weekend backgrounds, and task bar colors where they fit.
- Add resource-specific CSS variables: `--gantt-resource-row-header-width`, `--gantt-resource-lane-height`, `--gantt-resource-bar-radius`, and optional `--gantt-resource-bar-conflict-color`.
- Namespace resource CSS under classes such as `.gantt-resourceTimeline*` so existing `.gantt-taskArea` and task-mode styles remain stable.

### Documentation and Tests
- Add docs/readme examples for `mode="resource-planner"`.
- Existing task-mode tests must pass without consumer code changes.
- Add unit tests for lane layout, inclusive overlap, stable equal-date ordering, and invalid date handling.
- Add component tests for resource headers, item bars, empty rows, row-height growth, `renderItem`, and `getItemClassName`.
- Add interaction tests for horizontal drag, vertical resource move, drop outside rows, `readonly`, and `locked`.
- Add regression coverage proving task-mode dependency lines remain scoped to gantt mode.

### the agent's Discretion
- Exact file split for resource-specific utilities, hooks, and components.
- Whether invalid items render as a row-level diagnostic or are only returned from layout diagnostics, provided invalid input does not crash the chart.
- Exact visual polish of default resource bars, as long as existing design tokens and namespacing rules are followed.
- Whether horizontal and vertical drag share one hook or use resource-specific hooks.
- The minimum set of README/reference docs needed to document the new public API.

### Claude's Discretion
- Exact file split for resource-specific utilities, hooks, and components.
- Whether invalid items render as a row-level diagnostic or are only returned from layout diagnostics, provided invalid input does not crash the chart.
- Exact visual polish of default resource bars, as long as existing design tokens and namespacing rules are followed.
- Whether horizontal and vertical drag share one hook or use resource-specific hooks.
- The minimum set of README/reference docs needed to document the new public API.

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

- Resource dependency/link overlay is deferred.
- Built-in resource conflict rejection is deferred; overlaps are visualized, not blocked.
- Built-in state management is deferred; consumers own resource data.
- Advanced zoom modes beyond what existing header/grid utilities already support are deferred unless needed for parity.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RP-01 | Existing `GanttChart` task mode remains backward compatible when `mode` is omitted. | Keep default branch as existing task renderer; add export/type regression coverage. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md; packages/gantt-lib/src/components/GanttChart/GanttChart.tsx] |
| RP-02 | `mode="resource-planner"` renders resource timeline without `tasks`. | Use discriminated union props and route to a separate `ResourceTimelineChart`. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md] |
| RP-03 | Non-overlapping items in one resource occupy one lane. | Pure layout utility sorts by start/end/id and places into first non-overlapping lane. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md] |
| RP-04 | Overlapping items occupy multiple lanes. | Inclusive overlap rule must be covered by unit tests. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md] |
| RP-05 | Resource row height grows with lane count and empty resources stay visible. | Row model must return `resourceRowHeight`; renderer must use one-lane minimum. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md] |
| RP-06 | Horizontal drag emits changed dates and same resource id. | Resource-specific drag must preserve duration and call `onResourceItemMove` on mouseup only. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md; docs/reference/10-drag-interactions.md] |
| RP-07 | Vertical drag onto another resource emits new target resource id. | Drag hook must resolve target row from Y coordinate instead of using task reorder semantics. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md] |
| RP-08 | Drop outside resource rows emits no move. | Resource drag completion must distinguish valid row hit from invalid drop. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md] |
| RP-09 | `readonly` and `item.locked` disable resource drag. | Renderer/hook should gate at pointer start. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md] |
| RP-10 | `renderItem` and `getItemClassName` customize item content and classes. | Resource item component needs an inner-content override and class append path. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md] |
| RP-11 | Resource mode does not render dependency lines, hierarchy/cascade, task list editing, or task reorder behavior. | Facade split must prevent task-mode imports and state paths from running in resource branch. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md; packages/gantt-lib/src/components/GanttChart/GanttChart.tsx] |
</phase_requirements>

## Summary

Phase 30 is an additive renderer phase, not a task-mode extension. The current `GanttChart` implementation is heavily task-centric: it normalizes hierarchy, validates dependencies, renders `TaskList`, computes `DependencyLines`, drives `TaskRow`, and passes drag through `useTaskDrag` with cascade and hierarchy semantics. [VERIFIED: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx; packages/gantt-lib/src/hooks/useTaskDrag.ts; packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx] Resource planner mode should therefore branch at the facade and render a separate `ResourceTimelineChart` before task-mode state and effects are initialized. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md]

The reusable pieces are the timeline infrastructure: UTC date parsing, multi-month date generation, date labels, `calculateTaskBar`, `pixelsToDate`, `calculateGridWidth`, `TimeScaleHeader`, `GridBackground`, and `TodayIndicator`. [VERIFIED: packages/gantt-lib/src/utils/dateUtils.ts; packages/gantt-lib/src/utils/geometry.ts; packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx; packages/gantt-lib/src/components/GridBackground/GridBackground.tsx] The non-reusable pieces are task rows, task drag, dependency lines, task list, hierarchy order, parent aggregation, scheduling cascade, and task reorder. [VERIFIED: packages/gantt-lib/src/components/TaskRow/TaskRow.tsx; packages/gantt-lib/src/hooks/useTaskDrag.ts; packages/gantt-lib/src/components/TaskList/TaskList.tsx]

**Primary recommendation:** Add resource mode as a discriminated `GanttChart` facade branch that delegates to a new `ResourceTimelineChart`, with a pure lane-layout utility and a resource-specific drag hook/component. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md; repo inspection]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Public mode selection | Browser / Client | — | `GanttChart` is a client React component and currently owns prop interpretation. [VERIFIED: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx] |
| Resource data contract | Browser / Client | — | Package public TypeScript types expose consumer-facing resource props. [VERIFIED: packages/gantt-lib/src/index.ts; packages/gantt-lib/src/components/GanttChart/index.tsx] |
| Resource lane layout | Browser / Client | — | Layout is deterministic date-to-pixel computation and should be pure/testable with no DOM. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md] |
| Timeline grid/header | Browser / Client | — | Existing React components render the date header and background grid from date arrays. [VERIFIED: packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx; packages/gantt-lib/src/components/GridBackground/GridBackground.tsx] |
| Resource item drag/drop | Browser / Client | DOM events | Existing interactions are client-side mouse-driven; resource mode needs its own row hit detection. [VERIFIED: packages/gantt-lib/src/hooks/useTaskDrag.ts; .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md] |
| Persistence/state updates | Consumer app | Browser / Client callback | PRD locks controlled mode: library emits move callbacks, consumer updates `resources`. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md] |
| Dependency/cascade/hierarchy | Not applicable in resource mode | — | These are explicitly disabled in resource planner mode. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md] |

## Project Constraints (from CLAUDE.md)

- Respond in Russian. [VERIFIED: CLAUDE.md]
- Prefer direct, action-oriented guidance and avoid unrequested scope growth. [VERIFIED: CLAUDE.md]
- Follow instructions exactly and ask when unclear. [VERIFIED: CLAUDE.md]
- Focus on visual and functional correctness; make spacing/positioning work before aesthetics. [VERIFIED: CLAUDE.md]

No `AGENTS.md` file was found. [VERIFIED: shell `Test-Path AGENTS.md`]
No project-local `.claude/skills` or `.agents/skills` directories were found. [VERIFIED: shell project skills discovery]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | repo peer `>=18`, dev `^19.0.0`; latest `19.2.5`, modified 2026-04-24 | Component runtime | Existing package is React client-component based. [VERIFIED: packages/gantt-lib/package.json; npm registry] |
| TypeScript | repo `^5.7.0`; latest `6.0.3`, modified 2026-04-16 | Public API typing and discriminated union narrowing | Existing package exports TypeScript types and generates declarations through tsup. [VERIFIED: packages/gantt-lib/package.json; packages/gantt-lib/tsup.config.ts; npm registry] |
| Vitest | repo `^3.0.0`, installed CLI `3.2.4`; latest `4.1.5`, modified 2026-04-23 | Unit/component/interaction tests | Existing tests live under `src/**/__tests__` and run with jsdom. [VERIFIED: packages/gantt-lib/vitest.config.ts; npm registry] |
| date-fns | repo/latest `^4.1.0` / `4.1.0`, modified 2025-08-03 | Existing date formatting/parsing dependency | `dateUtils.ts` and `TimeScaleHeader.tsx` already use it. [VERIFIED: packages/gantt-lib/package.json; packages/gantt-lib/src/utils/dateUtils.ts; packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx; npm registry] |
| tsup | repo `^8.0.0`, installed/latest `8.5.1`, modified 2025-11-12 | Package build and declaration output | Existing config builds root and `core/scheduling` entries. [VERIFIED: packages/gantt-lib/tsup.config.ts; npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | repo/latest `^16.3.2` / `16.3.2`, modified 2026-01-19 | Component and mouse interaction tests | Use for rendering `GanttChart` and `ResourceTimelineChart` behavior. [VERIFIED: packages/gantt-lib/package.json; npm registry] |
| @testing-library/jest-dom | repo `^6.9.1` | DOM matchers | Use if existing test setup imports matchers in individual tests. [VERIFIED: packages/gantt-lib/package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `ResourceTimelineChart` renderer | Retrofit multi-lane behavior into `TaskRow` | Retrofitting conflicts with the current one-task-per-row geometry, dependency, hierarchy, and cascade assumptions. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md; packages/gantt-lib/src/components/TaskRow/TaskRow.tsx] |
| Resource-specific drag hook | Reuse `useTaskDrag` directly | Existing hook is coupled to tasks, dependencies, business-day cascade, parent/child movement, and resize modes. [VERIFIED: packages/gantt-lib/src/hooks/useTaskDrag.ts] |
| Controlled callback model | Built-in resource state manager | PRD defers built-in state management; current task mode already emits controlled callbacks. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md; packages/gantt-lib/src/components/GanttChart/GanttChart.tsx] |

**Installation:**
```bash
# No new package installation is required for Phase 30.
```
[VERIFIED: package.json inspection; npm registry checks]

## Architecture Patterns

### System Architecture Diagram

```text
Consumer props
  |
  v
GanttChart facade
  |
  +-- mode omitted or "gantt"
  |     |
  |     v
  |   Existing task renderer
  |     -> normalize hierarchy
  |     -> TaskList / TaskRow / DependencyLines / cascade
  |
  +-- mode "resource-planner"
        |
        v
      ResourceTimelineChart
        |
        +-> flatten resource items
        +-> parse UTC dates and build shared date range
        +-> layoutResourceTimelineItems
        +-> TimeScaleHeader + GridBackground + TodayIndicator
        +-> resource rows + item bars
        +-> resource drag preview
        |
        v
      onResourceItemMove callback
        |
        v
      Consumer updates resources
```
[VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md; packages/gantt-lib/src/components/GanttChart/GanttChart.tsx]

### Recommended Project Structure

```text
packages/gantt-lib/src/
├── components/
│   ├── GanttChart/                 # facade, discriminated props, default gantt mode
│   └── ResourceTimelineChart/      # resource renderer, rows, bars, CSS
├── hooks/
│   └── useResourceItemDrag.ts      # resource-specific date/resource move interaction
├── utils/
│   └── resourceTimelineLayout.ts   # pure lane layout and diagnostics
├── __tests__/
│   ├── resourceTimelineLayout.test.ts
│   ├── resourceTimelineChart.test.tsx
│   ├── resourceTimelineDrag.test.tsx
│   └── resourceModeRegression.test.tsx
└── index.ts                        # public exports
```
[VERIFIED: existing repo structure under packages/gantt-lib/src; .planning/phases/30-resource-mode/30-CONTEXT.md]

### Pattern 1: Facade Branch Before Task-Mode State

**What:** `GanttChart` should route `mode="resource-planner"` to `ResourceTimelineChart` before task-mode-only hooks and memoized state run. [VERIFIED: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx]

**When to use:** At the public API boundary. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]

**Example:**
```typescript
// Source: repo facade pattern + Phase 30 PRD
export type GanttChartMode = 'gantt' | 'resource-planner';

export type GanttChartProps<TTask extends Task = Task, TItem extends ResourceTimelineItem = ResourceTimelineItem> =
  | GanttModeProps<TTask>
  | ResourcePlannerChartProps<TItem>;

function GanttChartInner<TTask extends Task = Task, TItem extends ResourceTimelineItem = ResourceTimelineItem>(
  props: GanttChartProps<TTask, TItem>,
  ref: React.ForwardedRef<GanttChartHandle>
) {
  if (props.mode === 'resource-planner') {
    return <ResourceTimelineChart {...props} />;
  }

  return <TaskGanttChartInner {...props} ref={ref} />;
}
```
[VERIFIED: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx; .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]

### Pattern 2: Pure Lane Layout Utility

**What:** Layout should parse item dates, sort valid items, assign the first compatible lane, and return item geometry plus diagnostics for invalid items. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]

**When to use:** Before rendering resource rows and before drag-preview row-height calculations. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md]

**Example:**
```typescript
// Source: PRD algorithm + existing calculateTaskBar pattern
for (const item of sortedItems) {
  const laneIndex = lanes.findIndex(last => last.end.getTime() < item.start.getTime());
  const targetLane = laneIndex === -1 ? lanes.length : laneIndex;
  lanes[targetLane] = item;
}
```
[VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md; packages/gantt-lib/src/utils/geometry.ts]

### Pattern 3: Reuse Grid/Header, Not Task Rows

**What:** `TimeScaleHeader` and `GridBackground` already accept `days`, `dayWidth`, height, view mode, and weekend predicate; resource mode can reuse them by passing resource total height. [VERIFIED: packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx; packages/gantt-lib/src/components/GridBackground/GridBackground.tsx]

**When to use:** Rendering the right-side resource calendar. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]

**Do not use:** `TaskRow` for resource bars, because it calls `useTaskDrag`, parent detection, progress, milestone logic, baseline logic, and task-specific labels. [VERIFIED: packages/gantt-lib/src/components/TaskRow/TaskRow.tsx]

### Anti-Patterns to Avoid

- **Do not call `normalizeHierarchyTasks` in resource mode:** resource mode has no hierarchy/collapse semantics. [VERIFIED: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx; .planning/phases/30-resource-mode/30-CONTEXT.md]
- **Do not render `TaskList` in resource mode:** task list editing is explicitly disabled. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md]
- **Do not render `DependencyLines` in resource mode:** dependency overlays are task-mode-only and resource links are deferred. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md; packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx]
- **Do not reuse `useTaskDrag` directly:** it recalculates incoming lags, runs cascade, handles parent/child chains, and has resize modes. [VERIFIED: packages/gantt-lib/src/hooks/useTaskDrag.ts]
- **Do not mutate `resources` internally:** resource planner is controlled and emits callbacks. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date parsing and labels | New date parser/formatter | `parseUTCDate`, `formatDateRangeLabel` | Existing utilities enforce UTC handling and existing labels. [VERIFIED: packages/gantt-lib/src/utils/dateUtils.ts] |
| Date-to-pixel conversion | New ad hoc pixel math | `calculateTaskBar`, `pixelsToDate`, `calculateGridWidth` | Existing formulas use inclusive end dates and rounded pixels. [VERIFIED: packages/gantt-lib/src/utils/geometry.ts] |
| Calendar header/grid | New header/grid components | `TimeScaleHeader`, `GridBackground`, `TodayIndicator` | Existing components already align separators and weekend backgrounds. [VERIFIED: packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx; packages/gantt-lib/src/components/GridBackground/GridBackground.tsx] |
| Task dependency/resource links | Resource dependency engine | Nothing in Phase 30 | Resource links are deferred and task dependency engine is explicitly disabled. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md] |
| State management | Internal resource reducer as source of truth | Controlled `onResourceItemMove` callback | Consumer owns resource data. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md] |

**Key insight:** custom code is appropriate only for resource lane layout and resource item drag; the rest should reuse existing timeline primitives or stay out of resource mode. [VERIFIED: repo inspection + PRD]

## Common Pitfalls

### Pitfall 1: Letting task-mode side effects run for resource props
**What goes wrong:** `mode="resource-planner"` without `tasks` crashes or triggers task-mode dependency/hierarchy code. [VERIFIED: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx]
**Why it happens:** The current component destructures `tasks` and builds task state immediately. [VERIFIED: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx]
**How to avoid:** Split the facade so the resource branch returns before task-mode internals run. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md]
**Warning signs:** Resource-mode tests need dummy `tasks={[]}` or dependency-line mocks. [ASSUMED]

### Pitfall 2: Reusing `useTaskDrag`
**What goes wrong:** Resource moves inherit cascade, dependency lag recalculation, parent-child movement, resize behavior, or business-day clamping. [VERIFIED: packages/gantt-lib/src/hooks/useTaskDrag.ts]
**Why it happens:** `useTaskDrag` is now a mature task scheduler interaction hook, not a generic drag primitive. [VERIFIED: packages/gantt-lib/src/hooks/useTaskDrag.ts]
**How to avoid:** Build `useResourceItemDrag` around date snapping, row hit-testing, preview, and one callback. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]
**Warning signs:** Resource drag imports from `core/scheduling` or emits `onTasksChange`. [VERIFIED: packages/gantt-lib/src/hooks/useTaskDrag.ts]

### Pitfall 3: Treating adjacent inclusive items as non-overlapping
**What goes wrong:** Items ending and starting on the same day get placed in one lane even though the PRD says inclusive overlap. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]
**Why it happens:** Common interval layout algorithms use half-open intervals. [ASSUMED]
**How to avoid:** Use `laneLast.end < next.start` as the non-overlap check. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]
**Warning signs:** Unit test for `a.end === b.start` expects one lane. [ASSUMED]

### Pitfall 4: Invalid dates crash the whole chart
**What goes wrong:** One malformed item prevents all resources from rendering. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]
**Why it happens:** Existing `parseUTCDate` throws on invalid strings. [VERIFIED: packages/gantt-lib/src/utils/dateUtils.ts]
**How to avoid:** Catch parse failures inside the resource layout utility and return diagnostics. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md]
**Warning signs:** Tests use `toThrow` for invalid resource items. [ASSUMED]

### Pitfall 5: CSS leakage between modes
**What goes wrong:** Resource styling changes existing `.gantt-taskArea` or `.gantt-tr-*` task-mode visuals. [VERIFIED: packages/gantt-lib/src/styles.css; packages/gantt-lib/src/components/TaskRow/TaskRow.css]
**Why it happens:** Existing CSS uses broad package-level class namespaces and root variables. [VERIFIED: packages/gantt-lib/src/styles.css]
**How to avoid:** Use `.gantt-resourceTimeline*` classes and resource-specific variables. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md]
**Warning signs:** Task-mode snapshot/interaction tests change after resource CSS lands. [ASSUMED]

## Code Examples

### Resource Layout Shape

```typescript
// Source: PRD lane requirements + existing geometry utilities
export interface ResourceTimelineLayoutItem<TItem> {
  item: TItem;
  itemId: string;
  resourceId: string;
  laneIndex: number;
  left: number;
  width: number;
  resourceRowTop: number;
  resourceRowHeight: number;
  startDate: Date;
  endDate: Date;
}
```
[VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md; packages/gantt-lib/src/utils/geometry.ts]

### Resource Drag Completion

```typescript
// Source: PRD controlled callback contract
onResourceItemMove?.({
  item,
  itemId: item.id,
  fromResourceId: item.resourceId,
  toResourceId: targetResource.id,
  startDate: nextStartDate,
  endDate: nextEndDate,
});
```
[VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]

### Reusing Timeline Grid

```tsx
// Source: existing TimeScaleHeader/GridBackground props
<TimeScaleHeader days={dateRange} dayWidth={dayWidth} headerHeight={headerHeight} />
<GridBackground dateRange={dateRange} dayWidth={dayWidth} totalHeight={totalResourceHeight} />
```
[VERIFIED: packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx; packages/gantt-lib/src/components/GridBackground/GridBackground.tsx]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single task-mode `GanttChartProps` requires `tasks`. | Phase 30 needs discriminated `gantt` vs `resource-planner` props. | Phase 30 PRD, 2026-04-24 | Planner must add type tests and keep omitted `mode` as task mode. [VERIFIED: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx; .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md] |
| One row equals one task. | Resource row can contain multiple item lanes. | Phase 30 PRD, 2026-04-24 | Do not retrofit task row geometry. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md] |
| Drag means task move/resize plus dependencies/cascade. | Resource drag means date shift and optional resource reassignment only. | Phase 30 PRD, 2026-04-24 | Use a resource-specific hook. [VERIFIED: packages/gantt-lib/src/hooks/useTaskDrag.ts; .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md] |

**Deprecated/outdated:**
- Treating resource management as globally out of scope is outdated for Phase 30 because the locked PRD explicitly adds a resource planner visualization mode. [VERIFIED: .planning/REQUIREMENTS.md; .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]
- Reusing task dependency links for resource bars is out of scope and should be deferred. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Resource-mode warning signs around requiring dummy `tasks` are inferred from likely test failures, not observed in a failing test. | Common Pitfalls | Planner may over-prioritize a failure mode that only appears after implementation. |
| A2 | Half-open interval algorithms are a common cause of inclusive-overlap mistakes. | Common Pitfalls | Low implementation risk because PRD directly defines the required inclusive rule. |
| A3 | Task-mode snapshot/interaction tests may change if CSS leaks. | Common Pitfalls | Planner should still include regression tests because the namespacing requirement is locked. |

## Open Questions

1. **How should invalid resource items appear visually?**
   - What we know: invalid items must not crash chart and may be excluded from layout with diagnostics or rendered as invalid row state. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md]
   - What's unclear: whether the user wants a visible invalid marker. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md]
   - Recommendation: return diagnostics from `layoutResourceTimelineItems` first; render minimal row-level diagnostic only if it is easy and namespaced. [VERIFIED: PRD discretion]

2. **Should resource mode support `viewMode="week" | "month"` immediately?**
   - What we know: PRD says reuse existing multi-month date approach where practical and defers advanced zoom beyond existing utilities unless needed for parity. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]
   - What's unclear: whether public `ResourcePlannerChartProps` should expose `viewMode` in Phase 30. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]
   - Recommendation: keep day view as the required path unless the planner adds a small parity task for existing `TimeScaleHeader`/`GridBackground` view modes. [ASSUMED]

3. **Should `GanttChartHandle` methods do anything in resource mode?**
   - What we know: current handle exposes task-specific methods like `scrollToTask`, `scrollToRow`, collapse/expand, and export. [VERIFIED: packages/gantt-lib/src/components/GanttChart/GanttChart.tsx]
   - What's unclear: PRD does not specify resource-mode imperative handle behavior. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]
   - Recommendation: preserve ref type for backward compatibility, implement no-op task-specific methods in resource mode if needed, and do not add new handle methods in this phase. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | tests/build | Yes | `v22.22.1` | — [VERIFIED: shell `node --version`] |
| npm | package scripts/version checks | Yes | `10.9.4` | — [VERIFIED: shell `npm --version`] |
| Vitest CLI | test execution | Yes | `3.2.4` | Use `npm test` from package. [VERIFIED: shell `npx vitest --version`; packages/gantt-lib/package.json] |
| tsup CLI | package build | Yes | `8.5.1` | Use package `npm run build`. [VERIFIED: shell `npx tsup --version`; packages/gantt-lib/package.json] |

**Missing dependencies with no fallback:**
- None found. [VERIFIED: shell availability audit]

**Missing dependencies with fallback:**
- None found. [VERIFIED: shell availability audit]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `3.2.4` installed, jsdom environment. [VERIFIED: shell `npx vitest --version`; packages/gantt-lib/vitest.config.ts] |
| Config file | `packages/gantt-lib/vitest.config.ts` [VERIFIED: packages/gantt-lib/vitest.config.ts] |
| Quick run command | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineLayout.test.ts src/__tests__/resourceTimelineChart.test.tsx src/__tests__/resourceTimelineDrag.test.tsx src/__tests__/resourceModeRegression.test.tsx` [VERIFIED: packages/gantt-lib/package.json; proposed files] |
| Full suite command | `cd packages/gantt-lib && npm test` [VERIFIED: packages/gantt-lib/package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RP-01 | Omitted `mode` renders current gantt and existing exports remain valid. | regression/component | `cd packages/gantt-lib && npm test -- src/__tests__/export-contract.test.ts src/__tests__/resourceModeRegression.test.tsx` | Partial; new regression file needed. [VERIFIED: packages/gantt-lib/src/__tests__/export-contract.test.ts] |
| RP-02 | `mode="resource-planner"` renders without `tasks`. | component | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineChart.test.tsx` | No, Wave 0. [VERIFIED: rg --files] |
| RP-03 | Non-overlapping items use one lane. | unit | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineLayout.test.ts` | No, Wave 0. [VERIFIED: rg --files] |
| RP-04 | Inclusive overlaps use multiple lanes. | unit | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineLayout.test.ts` | No, Wave 0. [VERIFIED: rg --files] |
| RP-05 | Empty rows visible and row height grows with lane count. | component/unit | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineLayout.test.ts src/__tests__/resourceTimelineChart.test.tsx` | No, Wave 0. [VERIFIED: rg --files] |
| RP-06 | Horizontal drag emits moved dates with same resource id. | interaction | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineDrag.test.tsx` | No, Wave 0. [VERIFIED: rg --files] |
| RP-07 | Vertical drag emits target resource id. | interaction | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineDrag.test.tsx` | No, Wave 0. [VERIFIED: rg --files] |
| RP-08 | Drop outside rows emits no callback. | interaction | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineDrag.test.tsx` | No, Wave 0. [VERIFIED: rg --files] |
| RP-09 | `readonly` and locked item prevent callbacks. | interaction | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineDrag.test.tsx` | No, Wave 0. [VERIFIED: rg --files] |
| RP-10 | `renderItem` and `getItemClassName` customize output. | component | `cd packages/gantt-lib && npm test -- src/__tests__/resourceTimelineChart.test.tsx` | No, Wave 0. [VERIFIED: rg --files] |
| RP-11 | Resource mode excludes task list/dependencies/cascade/hierarchy/reorder. | regression/component | `cd packages/gantt-lib && npm test -- src/__tests__/dependencyLines.test.tsx src/__tests__/resourceModeRegression.test.tsx` | Partial; new regression file needed. [VERIFIED: packages/gantt-lib/src/__tests__/dependencyLines.test.tsx] |

### Sampling Rate

- **Per task commit:** targeted resource layout/chart/drag test file for the touched slice. [VERIFIED: existing Vitest package setup]
- **Per wave merge:** `cd packages/gantt-lib && npm test`. [VERIFIED: packages/gantt-lib/package.json]
- **Phase gate:** full package test suite plus docs/examples inspection. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md]

### Wave 0 Gaps

- [ ] `packages/gantt-lib/src/__tests__/resourceTimelineLayout.test.ts` — covers RP-03, RP-04, RP-05, invalid-date diagnostics. [VERIFIED: missing via rg --files]
- [ ] `packages/gantt-lib/src/__tests__/resourceTimelineChart.test.tsx` — covers RP-02, RP-05, RP-10. [VERIFIED: missing via rg --files]
- [ ] `packages/gantt-lib/src/__tests__/resourceTimelineDrag.test.tsx` — covers RP-06 to RP-09. [VERIFIED: missing via rg --files]
- [ ] `packages/gantt-lib/src/__tests__/resourceModeRegression.test.tsx` — covers RP-01 and RP-11. [VERIFIED: missing via rg --files]
- [ ] Export contract assertions for `ResourceTimelineChart` and resource public types. [VERIFIED: packages/gantt-lib/src/__tests__/export-contract.test.ts; packages/gantt-lib/src/index.ts]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Package has no authentication surface in Phase 30. [VERIFIED: PRD scope] |
| V3 Session Management | no | Package has no session surface in Phase 30. [VERIFIED: PRD scope] |
| V4 Access Control | no | Resource planner is display/edit callback UI; authorization is consumer-owned. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md] |
| V5 Input Validation | yes | Validate/diagnose invalid resource item dates in layout utility. [VERIFIED: .planning/phases/30-resource-mode/30-CONTEXT.md] |
| V6 Cryptography | no | No cryptographic behavior in Phase 30. [VERIFIED: PRD scope] |

### Known Threat Patterns for React Resource Timeline

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed dates causing denial of render | Denial of Service | Catch invalid date parsing per item and return diagnostics. [VERIFIED: .planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md; packages/gantt-lib/src/utils/dateUtils.ts] |
| Consumer-rendered item content causing layout breakage | Denial of Service | Constrain bar dimensions and render custom content inside fixed item shell. [ASSUMED] |
| Unauthorized resource reassignment | Elevation of Privilege | Do not enforce in library; consumer validates callback result before state update. [VERIFIED: controlled callback scope in PRD] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/30-resource-mode/30-CONTEXT.md` - locked decisions, disabled task-mode features, implementation boundaries. [VERIFIED: file read]
- `.planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md` - public API, layout algorithm, drag/drop behavior, acceptance criteria, suggested order. [VERIFIED: file read]
- `.planning/REQUIREMENTS.md` - no existing mapped REQ IDs and historical resource-management out-of-scope note. [VERIFIED: file read]
- `.planning/STATE.md` and `.planning/ROADMAP.md` - Phase 30 status and dependency on Phase 29. [VERIFIED: file read]
- `.planning/phases/29-milestones-type-tasks/29-RESEARCH.md` - recent task-mode dependency and milestone context. [VERIFIED: file read]
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` - current facade, task-mode orchestration, dependency/task-list wiring, imperative handle. [VERIFIED: file read]
- `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx` - task row rendering and task drag integration. [VERIFIED: file read]
- `packages/gantt-lib/src/hooks/useTaskDrag.ts` - task drag/cascade/hierarchy behavior. [VERIFIED: file read]
- `packages/gantt-lib/src/utils/dateUtils.ts` - UTC parsing, date range, labels, custom weekend predicate. [VERIFIED: file read]
- `packages/gantt-lib/src/utils/geometry.ts` - task bar geometry, pixel/date conversion, grid lines. [VERIFIED: file read]
- `packages/gantt-lib/src/components/GridBackground/GridBackground.tsx` - reusable grid renderer. [VERIFIED: file read]
- `packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx` - reusable timeline header. [VERIFIED: file read]
- `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx` and `packages/gantt-lib/src/components/TaskList/TaskList.tsx` - task-mode-only boundaries to exclude. [VERIFIED: file read/grep]
- `packages/gantt-lib/package.json`, `packages/gantt-lib/vitest.config.ts`, `packages/gantt-lib/tsup.config.ts` - package scripts and tool configuration. [VERIFIED: file read]

### Secondary (MEDIUM confidence)

- npm registry via `npm view react version time.modified` - React latest `19.2.5`, modified 2026-04-24. [VERIFIED: npm registry]
- npm registry via `npm view typescript version time.modified` - TypeScript latest `6.0.3`, modified 2026-04-16. [VERIFIED: npm registry]
- npm registry via `npm view vitest version time.modified` - Vitest latest `4.1.5`, modified 2026-04-23. [VERIFIED: npm registry]
- npm registry via `npm view @testing-library/react version time.modified` - latest `16.3.2`, modified 2026-01-19. [VERIFIED: npm registry]
- npm registry via `npm view date-fns version time.modified` - latest `4.1.0`, modified 2025-08-03. [VERIFIED: npm registry]
- npm registry via `npm view tsup version time.modified` - latest `8.5.1`, modified 2025-11-12. [VERIFIED: npm registry]

### Tertiary (LOW confidence)

- Assumptions A1-A3 in the Assumptions Log. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - package manifests, installed CLIs, and npm registry versions were checked. [VERIFIED: package files; shell; npm registry]
- Architecture: HIGH - locked PRD aligns with visible task-mode boundaries in current code. [VERIFIED: PRD; repo inspection]
- Pitfalls: HIGH for task-mode leakage/drag/date invalidity, MEDIUM for inferred warning signs. [VERIFIED: repo inspection; ASSUMED where marked]

**Research date:** 2026-04-24 [VERIFIED: system date]
**Valid until:** 2026-05-24 for repo architecture; 2026-05-01 for latest package-version facts. [ASSUMED]

