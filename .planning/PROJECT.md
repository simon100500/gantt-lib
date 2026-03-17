# Gantt Chart Library for Next.js

## What This Is

A lightweight React/Next.js library for displaying Gantt charts with interactive drag-and-drop, task dependencies, hierarchy, and Excel-like table styling. Users can drag and drop task bars to reschedule and resize them directly on the timeline.

## Core Value

Drag-and-drop task scheduling with Excel-like visual simplicity.

## Current State (v0.18.0)

**Shipped:** 2026-03-17

The library is published as `gantt-lib` v0.18.0 on npm with the following features:
- Monthly calendar grid with task bars
- Drag-and-drop task manipulation (move and resize)
- Task dependencies with FS/SS/FF/SF link types
- Task hierarchy (parent-child relationships)
- Task list panel with inline editing
- Dependency editing via TaskList
- Row reordering via drag-and-drop
- Expired task highlighting
- Action buttons panel
- shadcn/ui components (DatePicker, Input)

**Tech stack:** React 18+, TypeScript, date-fns, @radix-ui
**Bundle:** ~15KB gzipped
**LOC:** ~15,335 (TypeScript/TSX/CSS)

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

### Active

(None — all v1 requirements shipped in v0.18.0)

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

## Constraints

- **Tech Stack**: React/Next.js, TypeScript — Must work seamlessly in Next.js projects
- **Bundle Size**: Lightweight — Minimal dependencies, tree-shakeable
- **Styling**: CSS with CSS variables — Users can customize
- **Performance**: 60fps drag interactions on target scale
- **Browser**: Modern browsers — No IE11 requirement

---
*Last updated: 2026-03-17 after v0.18.0 milestone*
