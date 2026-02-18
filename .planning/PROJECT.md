# Gantt Chart Library for Next.js

## What This Is

A lightweight React/Next.js library for displaying Gantt charts with minimal features and Excel-like table styling. Users can drag and drop task bars to reschedule and resize them directly on the timeline.

## Core Value

Drag-and-drop task scheduling with Excel-like visual simplicity.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Display monthly calendar grid with task bars
- [ ] Drag tasks horizontally to change dates (move)
- [ ] Drag task edges to change duration (resize)
- [ ] Excel-like table styling (grid lines, cell-based appearance)
- [ ] Task names panel on the left
- [ ] Accept simple array of task data
- [ ] Support ~100 tasks with good performance
- [ ] Notify parent component of changes via callback
- [ ] Customizable task colors
- [ ] TypeScript support

### Out of Scope

- Task dependencies/links — keep it simple for v1
- Multiple zoom levels (day/week/year) — month only
- Task grouping or hierarchy
- Built-in state management — controlled component pattern
- Critical path calculations
- Resource management

## Context

- Target framework: Next.js (React)
- Style preference: Minimal, table-like, similar to Excel cell highlighting
- Performance target: ~100 tasks on one month timeline
- Use case: Project planning visualization in Next.js applications

## Constraints

- **Tech Stack**: React/Next.js, TypeScript — Must work seamlessly in Next.js projects
- **Bundle Size**: Lightweight — Minimal dependencies, tree-shakeable
- **Styling**: CSS modules or tailwind-compatible — Users should be able to customize
- **Performance**: 60fps drag interactions on target scale
- **Browser**: Modern browsers — No IE11 requirement

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Month-only view | Simplicity, covers "small projects" use case | — Pending |
| No task dependencies | Reduces complexity, focus on drag-and-drop UX | — Pending |
| Controlled component pattern | Fits React/Next.js patterns, user owns state | — Pending |

---
*Last updated: 2025-02-18 after initialization*
