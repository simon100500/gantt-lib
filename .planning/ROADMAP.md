# Roadmap: Gantt Chart Library

## Milestones

- ✅ **v0.18.0 Gantt Library MVP** — Phases 1-20 (shipped 2026-03-17)
  — See `.planning/milestones/v0.18.0-ROADMAP.md`
- 🔄 **v0.50.0 Adding Tools** — Phases 21-24 (in progress)

## Current Status

🎯 **Phase 23 planned** — Additional TaskList Columns

## Phases

- [x] **Phase 21: Custom Weekend Calendar** - User-defined weekend dates and flexible weekend logic
- [x] **Phase 21.1: custom-weekend-refactoring [INSERTED]** - Refactor three props (weekends, workdays, isWeekend) to unified customDays array
- [x] **Phase 22: filters** - Task filtering functionality
- [ ] **Phase 23: Additional TaskList Columns** - Custom columns with renderers and editors
- [ ] **Phase 24: buisiness-days** - Business days calculation mode for task duration

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
3. Cell content renders correctly via `renderCell: (row: GanttRow) => ReactNode` for each row
4. Inline editor appears via `editor?: (row: GanttRow) => ReactNode` when user clicks editable cells
5. Column width is customizable via `width?: string | number` prop
6. Additional columns scroll horizontally with TaskList panel
7. Base columns (№, Name, Dates, Dependencies, Actions) remain unchanged and functional

**Plans:** 3 plans

- [x] 23-01-PLAN.md — Define TaskListColumn public contracts and create wave-0 integration tests
- [x] 23-02-PLAN.md — Wire generic additionalColumns through GanttChart/TaskList and render display columns inline
- [x] 23-03-PLAN.md — Add custom editor lifecycle in TaskListRow and close the phase with green tests

### Phase 24: buisiness-days

**Goal:** Добавить режим учёта только рабочих дней при расчёте duration задач. Когда `businessDays={true}`, duration считается в рабочих днях (исключая выходные по isWeekend/customDays), а не в календарных.

**Depends on:** Phase 23

**Requirements:** None (internal feature, not tracked in REQUIREMENTS.md)

**Success Criteria** (what must be TRUE):
1. Пользователь может передать `businessDays?: boolean` проп в GanttChart
2. Duration задач считается в рабочих днях (исключая выходные по isWeekend/customDays)
3. При редактировании duration endDate пересчитывается правильно
4. Обратная совместимость: без пропса работает как раньше (календарные дни)
5. Не затронуты dependencyUtils.ts (calculateSuccessorDate, cascade)

**Plans:** 2 plans

- [x] 24-01-PLAN.md — Create and implement getBusinessDaysCount and addBusinessDays utilities (TDD)
- [x] 24-02-PLAN.md — Integrate businessDays prop into GanttChart, TaskList, TaskListRow with memoized conditional functions

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-20 | v0.18.0 | 50/51 | Complete | 2026-03-17 |
| 21 | v0.50.0 | 4/4 | Complete   | 2026-03-22 |
| 21.1 | v0.50.0 | 1/1 | Complete | 2026-03-18 |
| 22 | v0.50.0 | 2/2 | Complete | 2026-03-19 |
| 23 | v0.50.0 | 3/3 | Complete   | 2026-03-27 |
| 24 | v0.50.0 | 2/2 | Complete   | 2026-03-22 |

**Overall:** 53/62 plans complete (85%)

<details>
<summary>✅ v0.18.0 Gantt Library MVP (Phases 1-20) — SHIPPED 2026-03-17</summary>

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
<summary>🔄 v0.50.0 Adding Tools (Phases 21-23) — IN PROGRESS</summary>

### Overview

Add developer tools and calendar customization features to the Gantt library.

### Completed Phases

- [x] **Phase 21.1: custom-weekend-refactoring** (1/1 plans) — Refactor API to unified customDays array
- [x] **Phase 22: filters** (2/2 plans) — Task filtering with predicate-based API

**Total:** 2 phases complete, 2 in progress

</details>

---

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

**Roadmap updated:** 2026-03-27
