# Gantt Chart Library for Next.js

## What This Is

A lightweight React/Next.js library for displaying Gantt charts with interactive drag-and-drop, task dependencies, hierarchy, and Excel-like table styling. Users can drag and drop task bars to reschedule and resize them directly on the timeline.

## Core Value

Drag-and-drop task scheduling with Excel-like visual simplicity.

## Current Milestone: v0.50.0 Adding Tools

**Goal:** Add extensibility features — custom weekend calendar, task filtering, and additional TaskList columns

**Target features:**
- Custom weekend calendar (Date[] array + isWeekend predicate)
- Task filtering API with ready-made predicates
- Additional TaskList columns with renderCell/renderEditor, positioned after Name column

## Current State (v0.22.0)

**Shipped:** 2026-03-19

The library is published as `gantt-lib` v0.22.0 on npm with the following features:
- Monthly calendar grid with task bars
- Drag-and-drop task manipulation (move and resize)
- Task dependencies with FS/SS/FF/SF link types
- Task hierarchy (parent-child relationships)
- Task list panel with inline editing
- Dependency editing via TaskList
- Row reordering via drag-and-drop
- Expired task highlighting
- Action buttons panel
- **Task filtering API** (Phase 22) — predicate-based filtering with ready-made utilities
- **Unified column pipeline** (Phase 25) — `resolvedColumns.map()` architecture with single editor state
- **Columns API migration** (Phase 26) — unified column API with `renderEditor` as the only editor property
- shadcn/ui components (DatePicker, Input)

**Tech stack:** React 18+, TypeScript, date-fns, @radix-ui
**Bundle:** ~15KB gzipped
**LOC:** ~16,500 (TypeScript/TSX/CSS)

## Requirements

### Validated

- ✅ Display monthly calendar grid with task bars — v0.18.0
- ✅ Drag tasks horizontally to change dates (move) — v0.18.0
- ✅ Drag task edges to change duration (resize) — v0.18.0
- ✅ Excel-like table styling (grid lines, cell-based appearance) — v0.18.0
- ✅ Task names panel on the left — v0.18.0
- ✅ Accept simple array of task data — v0.18.0
- ✅ Support ~100 tasks with good performance — v0.18.0
- ✅ Notify parent component of changes via callback — v0.18.0
- ✅ Customizable task colors — v0.18.0
- ✅ TypeScript support — v0.18.0
- ✅ Task filtering with predicates — v0.22.0
- ✅ Unified column pipeline — resolvedColumns.map() architecture, single editor state — v0.50.0 (Phase 25)

### Out of Scope

- Multiple zoom levels (day/week/year) — month only
- Built-in state management — controlled component pattern
- Critical path calculations
- Resource management
- Export to PDF/PNG — browser print sufficient

## Context

**Codebase state:**
- Monorepo: `packages/gantt-lib` (library) + `packages/website` (demo)
- React 19 compatible, TypeScript 5.7
- Vitest for testing
- tsup for bundling (ESM + CJS)

**Known issues:**
- Phase 16 plan 16-03 (demo page wiring) incomplete — minor gap

**User feedback themes:**
(None yet — no external users)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Month-only view | Simplicity, covers "small projects" use case | ✓ Good — keeps library focused |
| No task dependencies (initial) | Reduces complexity, focus on drag-and-drop UX | ⚠️ Revisit — added in Phase 6+ due to user need |
| Controlled component pattern | Fits React/Next.js patterns, user owns state | ✓ Good — flexible integration |
| UTC date handling | Prevents DST bugs | ✓ Good — proven correct |
| parentId-based hierarchy | Flat array structure, simpler than nested | ✓ Good — works well with drag-drop |
| Predicate-based filtering | Composable, TypeScript-friendly, testable | ✓ Good — flexible API (Phase 22) |

## Constraints

- **Tech Stack**: React/Next.js, TypeScript — Must work seamlessly in Next.js projects
- **Bundle Size**: Lightweight — Minimal dependencies, tree-shakeable
- **Styling**: CSS with CSS variables — Users can customize
- **Performance**: 60fps drag interactions on target scale
- **Browser**: Modern browsers — No IE11 requirement

---
*Last updated: 2026-03-29 after Phase 25 (columns-refactoring) completed*
