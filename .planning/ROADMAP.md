# Roadmap: Gantt Chart Library

## Milestones

- ✅ **v0.18.0 Gantt Library MVP** — Phases 1-20 (shipped 2026-03-17)
  — See `.planning/milestones/v0.18.0-ROADMAP.md`
- 🔄 **v0.50.0 Adding Tools** — Phases 21-28 (in progress)

## Current Status

🎯 **Phase 28 planning** — Scheduling Core Hardening

## Phases

- [x] **Phase 21: Custom Weekend Calendar** - User-defined weekend dates and flexible weekend logic
- [x] **Phase 21.1: custom-weekend-refactoring [INSERTED]** - Refactor three props (weekends, workdays, isWeekend) to unified customDays array
- [x] **Phase 22: filters** - Task filtering functionality
- [x] **Phase 23: Additional TaskList Columns** - Custom columns with renderers and editors
- [x] **Phase 24: buisiness-days** - Business days calculation mode for task duration
- [x] **Phase 25: columns-refactoring** - Unified column pipeline for TaskList
- [x] **Phase 26: columns-api-migration** - Remove legacy column API, enforce new renderEditor/width contract
- [x] **Phase 27: core-refactor** - Extract scheduling logic into headless runtime-agnostic core module
- [ ] **Phase 28: scheduling-core-hardening** - Domain/UI boundary separation, command-level API, documentation

### Phase 21: Custom Weekend Calendar

**Goal:** Users can define custom weekend dates and flexible weekend logic for non-standard work calendars

**Depends on:** Nothing (standalone feature)

**Requirements:** CAL-01, CAL-02, CAL-03, CAL-04, CAL-05

**Success Criteria** (what must be TRUE):
1. User can pass custom weekend dates via `weekends?: Date[]` prop and see them highlighted in red on the grid
2. User can pass `isWeekend?: (date: Date) => boolean` predicate for flexible weekend logic (e.g., Sunday-only, shift patterns)
3. When both props provided, `workdays` takes precedence over `weekends` array (date in both = workday)
4. Default Saturday/Sunday behavior remains unchanged when no props passed
5. Custom weekend highlighting works correctly across month boundaries in multi-month views

**Plans:** 4 plans

- [x] 21-01-PLAN.md — Create test stubs for custom weekend utilities (TDD RED phase)
- [x] 21-02-PLAN.md — Implement createDateKey, createIsWeekendPredicate, and modify calculateWeekendBlocks (TDD GREEN phase)
- [x] 21-03-PLAN.md — Integrate custom weekends into GanttChart, GridBackground, TimeScaleHeader, and Calendar
- [x] 21-04-PLAN.md — Create demo page with visual verification examples

### Phase 21.1: custom-weekend-refactoring [INSERTED]

**Goal:** Refactor custom weekend API from three props (weekends, workdays, isWeekend) to unified customDays array with explicit type annotations

**Depends on:** Phase 21

**Requirements:** None (internal refactoring, no new user-facing requirements)

**Success Criteria** (what must be TRUE):
1. GanttChart accepts `customDays?: Array<{date: Date; type: 'weekend' | 'workday'}>` prop instead of separate weekends/workdays arrays
2. Optional `isWeekend?: (date: Date) => boolean` prop retained for base weekend logic
3. customDays entries override isWeekend predicate when both specify the same date
4. Old three-prop API (weekends, workdays) removed from GanttChartProps
5. All existing functionality preserved with new API (holidays, shifted workdays, custom predicates)
6. Set-based lookup performance maintained (O(1) date checks)

**Plans:** 1 plan

- [x] 21.1-01-PLAN.md — Refactor API: replace weekends/workdays props with customDays array, update utilities, migrate tests

### Phase 22: filters

**Goal:** Users can filter tasks by various criteria using predicate-based API with ready-made utilities

**Depends on:** Phase 21.1

**Requirements:** None (internal feature, not tracked in REQUIREMENTS.md)

**Success Criteria** (what must be TRUE):
1. User can import TaskPredicate type and ready-made filters from 'gantt-lib/filters'
2. Boolean composites (and, or, not) allow combining any predicates
3. Ready-made filters work without additional code: withoutDeps, expired, inDateRange, progressInRange, nameContains
4. User can pass taskFilter prop to GanttChart and see filtered view
5. Dependencies still work on ALL tasks (including hidden by filter)
6. Filtered view updates in real-time as filters change

**Plans:** 2 plans

- [x] 22-01-PLAN.md — Create filters module with TaskPredicate type, boolean composites, and 5 ready-made filters
- [x] 22-02-PLAN.md — Integrate taskFilter prop into GanttChart and add public export from index.ts

### Phase 23: Additional TaskList Columns

**Goal:** Users can extend TaskList with custom columns for project-specific data (assignee, status, priority, etc.)

**Depends on:** Phase 22

**Requirements:** COL-01, COL-02, COL-03, COL-04, COL-05, COL-06, COL-07, COL-08

**Success Criteria** (what must be TRUE):
1. User can pass `additionalColumns?: Column[]` prop to TaskList and see new columns render in the table
2. Custom columns render after specified base column (via `after?: string` prop, defaults to after 'Name')
3. Cell content renders correctly via `renderCell: (ctx: TaskListColumnContext<TTask>) => ReactNode` for each row
4. Inline editor appears via `renderEditor?: (ctx: TaskListColumnContext<TTask>) => ReactNode` when user clicks editable cells
5. Column width is customizable via `width?: number` prop
6. Additional columns scroll horizontally with TaskList panel
7. Base columns (No, Name, Dates, Dependencies, Actions) remain unchanged and functional

**Plans:** 3 plans

- [x] 23-01-PLAN.md — Define TaskListColumn public contracts and create wave-0 integration tests
- [x] 23-02-PLAN.md — Wire generic additionalColumns through GanttChart/TaskList and render display columns inline
- [x] 23-03-PLAN.md — Add custom editor lifecycle in TaskListRow and close the phase with green tests

### Phase 24: buisiness-days

**Goal:** Add business days calculation mode for task duration

**Depends on:** Phase 23

**Requirements:** None (internal feature, not tracked in REQUIREMENTS.md)

**Success Criteria** (what must be TRUE):
1. User can pass `businessDays?: boolean` prop to GanttChart
2. Duration calculated in business days (excluding weekends per isWeekend/customDays)
3. Editing duration recalculates endDate correctly
4. Backward compatible: without prop works as before (calendar days)
5. dependencyUtils.ts not affected (calculateSuccessorDate, cascade)

**Plans:** 2 plans

- [x] 24-01-PLAN.md — Create and implement getBusinessDaysCount and addBusinessDays utilities (TDD)
- [x] 24-02-PLAN.md — Integrate businessDays prop into GanttChart, TaskList, TaskListRow with memoized conditional functions

### Phase 25: columns-refactoring

**Goal:** Refactor TaskList column system: unify built-in and custom columns into single pipeline with one contract, one resolver, one render path, one editor lifecycle, and numeric-only width model

**Depends on:** Phase 24

**Requirements:** None (internal refactoring, no requirement IDs)

**Success Criteria** (what must be TRUE):
1. Built-in and custom columns share one `TaskListColumn<TTask>` interface
2. Column order resolved by pure `resolveTaskListColumns()` function with before/after anchoring
3. Header and body render from single `resolvedColumns.map()` pipeline
4. Single `editingColumnId` state controls all editors (built-in and custom) per row
5. Numeric-only width model (no string CSS parsing)
6. Generic `TTask` flows through entire chain without `as Task` casts at boundaries
7. All existing tests pass without modification to test assertions

**Plans:** 4 plans

- [x] 25-01-PLAN.md — Structural foundations: column types, resolver with TDD, backward-compat bridge
- [x] 25-02-PLAN.md — Render unification: createBuiltInColumns factory, header/body via resolvedColumns.map()
- [x] 25-03-PLAN.md — Editor unification: single editingColumnId replaces 4 separate states
- [x] 25-04-PLAN.md — Generic tightening and cleanup: remove casts, dead code, finalize

### Phase 26: columns-api-migration

**Goal:** Remove legacy column editor API (`editor` property, fallback logic) and enforce the new unified contract (`renderEditor`, numeric `width`, canonical import path) as the only supported approach

**Depends on:** Phase 25

**Requirements:** MIG-01, MIG-02, MIG-03, MIG-04, MIG-05, MIG-06, MIG-07

**Success Criteria** (what must be TRUE):
1. `TaskListRow.tsx` no longer supports legacy `editor` property
2. No repo examples use `editor` — only `renderEditor`
3. No docs show `editor`
4. Column examples use numeric `width`
5. A maintainer can inspect the repo and find only one supported authoring style
6. All existing custom column tests pass after removing legacy support
7. Migration note documents the breaking change

**Plans:** 2 plans

- [x] 26-01-PLAN.md — Удалить legacy editor fallback, bridge файл, обновить импорты и демо
- [x] 26-02-PLAN.md — Обновить документацию и добавить migration note

### Phase 27: core-refactor

**Goal:** Extract scheduling logic from UI-adjacent modules into a standalone headless core module (src/core/scheduling/) that is runtime-agnostic — no React, no DOM, no date-fns. Rewire existing UI code to import from the new core boundary.

**Depends on:** Phase 26

**Requirements:** CORE-01, CORE-02, CORE-03, CORE-04, CORE-05

**Success Criteria** (what must be TRUE):
1. src/core/scheduling/ exists with zero React/DOM/date-fns imports
2. All 30+ scheduling functions importable from core/scheduling/index.ts
3. dependencyUtils.ts is a thin re-export barrel
4. All UI consumers import scheduling from core/scheduling
5. All existing tests pass, build succeeds

**Plans:** 2 plans

- [x] 27-01-PLAN.md — Create core/scheduling module, move scheduling logic from dependencyUtils + dateUtils, create backward-compat re-export barrels
- [x] 27-02-PLAN.md — Rewire UI consumers to import from core/scheduling, extract inline scheduling from useTaskDrag

### Phase 28: scheduling-core-hardening

**Goal:** Make core/scheduling server-ready with clean domain/UI boundary, command-level API, and accurate documentation

**Depends on:** Phase 27

**Requirements:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6

**Success Criteria** (what must be TRUE):
1. Pixel-based UI functions live in adapters/scheduling/, not in core/scheduling/
2. Downstream consumer can call moveTaskWithCascade/resizeTaskWithCascade without manual helper composition
3. ScheduleTask and ScheduleCommandResult types define minimal scheduling contract
4. Documentation matches code: normalizeDependencyLag semantics, cascadeByLinks per-type behavior, command API
5. Core scheduling runs in pure Node without React/DOM/jsdom
6. Backward-compatible re-exports preserve existing import paths

**Plans:** 3 plans

- [x] 28-01-PLAN.md — Domain types + execute.ts command API + parity tests
- [x] 28-02-PLAN.md — UI extraction: move pixel functions to adapters/scheduling, update useTaskDrag
- [x] 28-03-PLAN.md — Boundary tests + documentation corrections + downstream guide

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-20 | v0.18.0 | 50/51 | Complete | 2026-03-17 |
| 21 | v0.50.0 | 4/4 | Complete   | 2026-03-22 |
| 21.1 | v0.50.0 | 1/1 | Complete | 2026-03-18 |
| 22 | v0.50.0 | 2/2 | Complete | 2026-03-19 |
| 23 | v0.50.0 | 3/3 | Complete    | 2026-03-27 |
| 24 | v0.50.0 | 2/2 | Complete   | 2026-03-22 |
| 25 | v0.50.0 | 4/4 | Complete    | 2026-03-29 |
| 26 | v0.50.0 | 2/2 | Complete    | 2026-03-29 |
| 27 | v0.50.0 | 2/2 | Complete    | 2026-03-30 |
| 28 | v0.50.0 | 3/3 | Complete    | 2026-03-30 |

**Overall:** 64/69 plans complete (93%)

<details>
<summary>v0.18.0 Gantt Library MVP (Phases 1-20) — SHIPPED 2026-03-17</summary>

### Overview

Build a lightweight React/Next.js library for interactive Gantt charts. Starting from project scaffolding, we'll establish the rendering foundation with UTC-safe date handling, then add drag-and-drop interactions with performance optimization, and finally polish the developer experience with TypeScript, theming, and production readiness.

### Completed Phases

- [x] **Phase 1: Foundation & Core Rendering** (3/3 plans) — Static Gantt chart with monthly timeline and task bars
- [x] **Phase 2: Drag-and-Drop Interactions** (3/3 plans) — Interactive task manipulation via drag operations
- [x] **Phase 3: Calendar Grid** (4/4 plans) — Multi-month grid with two-row header, vertical lines, weekend highlighting
- [x] **Phase 4: npm-packaging** (5/5 plans) — Monorepo structure with gantt-lib package + website demo
- [x] **Phase 5: progress-bars** (1/1 plans) — Visual progress indicators on task bars
- [x] **Phase 6: dependencies** (4/4 plans) — Task dependencies with FS/SS/FF/SF link types, Bezier visualization
- [x] **Phase 7: dependencies constraints** (2/2 plans) — FS constraint enforcement with hard/soft cascade modes
- [x] **Phase 8: SS dependency** (3/3 plans) — Start-to-Start constraint enforcement
- [x] **Phase 9: FF-dependency** (3/3 plans) — Finish-to-Finish constraint enforcement
- [x] **Phase 10: SF dependency** (1/1 plans) — Start-to-Finish constraint enforcement
- [x] **Phase 11: lock-task** (2/2 plans) — Per-task locked prop with padlock icon
- [x] **Phase 12: task list** (2/2 plans) — Task list overlay panel with inline editing
- [x] **Phase 13: ui-components** (1/1 plans) — shadcn/ui DatePicker and Input components
- [x] **Phase 14: dependencies-edit** (2/2 plans) — Dependency creation via TaskList column
- [x] **Phase 15: expired-coloring** (1/1 plans) — Red highlighting for overdue tasks
- [x] **Phase 16: adding-tasks** (2/3 plans) — Add/delete tasks via TaskList
- [x] **Phase 17: action-buttons-panel** (1/1 plans) — Action buttons column
- [x] **Phase 18: tasks-order** (3/3 plans) — Drag-and-drop row reordering
- [x] **Phase 19: hierarchy** (4/4 plans) — Parent-child relationships with date/progress aggregation
- [x] **Phase 20: month-view** (3/3 plans) — Week/month view mode with alternate header

**Total:** 20 phases, 50/51 plans (98%)

</details>

<details>
<summary>v0.50.0 Adding Tools (Phases 21-28) — IN PROGRESS</summary>

### Overview

Add developer tools and calendar customization features to the Gantt library.

### Completed Phases

- [x] **Phase 21: Custom Weekend Calendar** (4/4 plans) — Custom weekend dates and flexible weekend logic
- [x] **Phase 21.1: custom-weekend-refactoring** (1/1 plans) — Refactor API to unified customDays array
- [x] **Phase 22: filters** (2/2 plans) — Task filtering with predicate-based API
- [x] **Phase 23: Additional TaskList Columns** (3/3 plans) — Custom columns with renderers and editors
- [x] **Phase 24: buisiness-days** (2/2 plans) — Business days calculation mode
- [x] **Phase 25: columns-refactoring** (4/4 plans) — Unified column pipeline for TaskList
- [x] **Phase 26: columns-api-migration** (2/2 plans) — Remove legacy column API
- [x] **Phase 27: core-refactor** (2/2 plans) — Extract scheduling logic into headless core module

### In Progress

- [ ] **Phase 28: scheduling-core-hardening** (0/3 plans) — Domain/UI boundary, command API, documentation

**Total:** 8 phases complete, 1 in progress

</details>

### Phase 29: Milestones type tasks

**Goal:** Add milestone task support as an explicit `Task.type` subtype rendered as a single-date diamond with move-only chart interaction, while keeping dependency semantics and existing `parentId` hierarchy behavior unchanged
**Requirements**: PH29-1, PH29-2, PH29-3, PH29-4, PH29-5, PH29-6
**Depends on:** Phase 28
**Success Criteria** (what must be TRUE):
1. User can mark a task with `type: 'milestone'` and the public Task contract accepts it without introducing a new `project` type
2. A milestone renders as a visible diamond on a single date, while a regular same-day task stays rectangular unless explicitly typed as milestone
3. Milestones are move-only on the chart: resize handles and resize drag paths do not create multi-day milestones
4. TaskList edits keep milestone `startDate` and `endDate` synchronized to one date and do not allow independent duration growth
5. FS/SS/FF/SF dependency semantics stay unchanged; only milestone endpoint geometry changes where needed
6. Demo/sample data and docs show milestone usage and explicitly preserve existing `parentId`-based parent/project grouping semantics

**Plans:** 3 plans

Plans:
- [ ] 29-01-PLAN.md — Lock public milestone contract, shared helpers, and milestone test targets
- [ ] 29-02-PLAN.md — Implement diamond rendering, move-only drag, and milestone dependency geometry
- [ ] 29-03-PLAN.md — Make TaskList milestone-aware and update samples/docs

---

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

**Roadmap updated:** 2026-03-30
