# Phase 30: resource-mode - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Source:** PRD Express Path (`.planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md`)

<domain>
## Phase Boundary

Phase 30 adds a second visualization mode to `gantt-lib`: resource planner mode. The existing `GanttChart` task-based mode remains the default and must keep backward compatibility. When the consumer passes `mode="resource-planner"`, the library renders a compact resource calendar with one row per resource, assignment bars inside rows, automatic lanes for overlapping assignments, and drag/drop callbacks for date and resource changes.

The resource planner is a separate renderer behind the shared `GanttChart` facade. Do not retrofit multi-lane resource behavior into the current task-based row geometry, dependency engine, hierarchy model, parent aggregation, or drag cascade.

</domain>

<decisions>
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source PRD
- `.planning/GANTT-LIB-RESOURCE-PLANNER-MODE-PRD.md` - locked scope, public API, layout algorithm, drag/drop behavior, acceptance criteria, and suggested implementation order.

### Current Gantt Facade and Exports
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` - current task-mode facade, props, date range setup, task list/chart layout, dependency lines, drag wiring, and imperative ref behavior.
- `packages/gantt-lib/src/components/GanttChart/index.tsx` - current GanttChart component export boundary.
- `packages/gantt-lib/src/index.ts` - package public exports and type exports.
- `packages/gantt-lib/src/types/index.ts` - shared public utility types.

### Shared Timeline Infrastructure
- `packages/gantt-lib/src/utils/dateUtils.ts` - UTC parsing, multi-month date ranges, date labels, and header block helpers.
- `packages/gantt-lib/src/utils/geometry.ts` - task bar geometry, pixel/date conversion, grid calculations, and reusable date-to-pixel formulas.
- `packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx` - reusable date header component.
- `packages/gantt-lib/src/components/GridBackground/GridBackground.tsx` - reusable timeline grid and weekend background component.
- `packages/gantt-lib/src/components/TodayIndicator/TodayIndicator.tsx` - current timeline today marker.
- `packages/gantt-lib/src/styles.css` - package-level CSS import surface.

### Existing Task Mode Boundaries
- `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx` - current task bar rendering and task drag integration; useful as a visual and interaction reference, not as a resource-mode dependency.
- `packages/gantt-lib/src/hooks/useTaskDrag.ts` - current task drag behavior; resource mode can borrow patterns but must not inherit dependency cascade semantics.
- `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx` - explicitly gantt-mode-only dependency overlay.
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` - task-mode-only task list editing surface.
- `packages/gantt-lib/src/core/scheduling/*` - scheduling, hierarchy, dependency, and cascade logic that must remain outside resource planner mode.

### Tests and Docs
- `packages/gantt-lib/src/__tests__/export-contract.test.ts` - public export regression pattern.
- `packages/gantt-lib/src/__tests__/geometry.test.ts` - utility test style for date/pixel calculations.
- `packages/gantt-lib/src/__tests__/ganttChartDatePickerTarget.test.tsx` - component test harness patterns for `GanttChart`.
- `packages/gantt-lib/src/__tests__/dependencyLines.test.tsx` - dependency-line regression scope.
- `packages/gantt-lib/README.md` - package README examples.
- `docs/reference/04-props.md` - public prop reference.
- `docs/reference/10-drag-interactions.md` - drag interaction documentation.
- `docs/reference/09-styling.md` - CSS variable documentation.

</canonical_refs>

<specifics>
## Specific Ideas

- Implement in small slices matching the PRD order: public types, layout utility, read-only renderer, facade wiring, drag behavior, docs.
- Favor a `ResourceTimelineChart` component that owns resource layout and leaves `GanttChartInner` focused on task mode.
- Use one-lane height for empty resources so consumers can plan capacity even before assignments exist.
- Keep resource mode controlled: the library emits `onResourceItemMove`, and the consumer updates `resources`.
- The layout utility should be testable without React and should not depend on DOM APIs.
- Resource drag should use document-level move/up listeners or an equivalent existing pattern, but callbacks must only fire on valid mouseup/drop.

</specifics>

<deferred>
## Deferred Ideas

- Resource dependency/link overlay is deferred.
- Built-in resource conflict rejection is deferred; overlaps are visualized, not blocked.
- Built-in state management is deferred; consumers own resource data.
- Advanced zoom modes beyond what existing header/grid utilities already support are deferred unless needed for parity.

</deferred>

---

*Phase: 30-resource-mode*
*Context gathered: 2026-04-24 via PRD Express Path*
