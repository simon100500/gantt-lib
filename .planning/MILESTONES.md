# Milestones

## v0.18.0 Gantt Library MVP (Shipped: 2026-03-17)

**Phases completed:** 20 phases, 51 plans, 98% complete

**Key accomplishments:**
- Core rendering: Monthly calendar grid with task bars, today indicator, Excel-like styling
- Drag-and-drop: Task move and resize with 60fps performance
- Task dependencies: Full FS/SS/FF/SF link type support with cascade constraints
- Hierarchy: Parent-child relationships with automatic date/progress aggregation
- Task list: Inline editing, row reordering, add/delete actions
- Developer experience: Full TypeScript, shadcn/ui components, CSS theming
- npm packaging: Monorepo with publishable library + demo website

**Timeline:** 2026-02-18 → 2026-03-17 (28 days)
**LOC:** ~15,335 TypeScript/TSX
**Bundle:** ~15KB gzipped

---

## v0.50.0 Adding Tools (In Progress)

**Started:** 2026-03-18
**Phases completed:** 2 of 4 phases, 3 of ~60 plans

### Completed Features

**Phase 21.1: Custom Weekend Refactoring** (2026-03-18)
- Unified `customDays` array API with explicit type annotations
- Optional `isWeekend` predicate for base weekend logic
- Set-based O(1) lookup performance
- Support for holidays, working Saturdays, alternative work week patterns

**Phase 22: Task Filtering** (2026-03-19)
- Predicate-based filtering API via `gantt-lib/filters`
- Boolean composites: `and`, `or`, `not`
- Ready-made filters: `withoutDeps`, `expired`, `inDateRange`, `progressInRange`, `nameContains`
- `taskFilter` prop on GanttChart component
- Dependencies work on all tasks regardless of filter
- Real-time filter updates

### Planned Features

**Phase 21: Custom Weekend Calendar**
- Custom weekend dates via `customDays` prop
- Flexible weekend patterns via `isWeekend` predicate
- Visual highlighting of custom weekends on grid

**Phase 23: Additional TaskList Columns**
- Custom columns with `renderCell` and `editor` functions
- Configurable column positioning via `after` prop
- Horizontal scrolling for additional columns

**Timeline:** 2026-03-18 → TBD
**LOC:** ~16,500 TypeScript/TSX (estimated)

---
