# Roadmap: Gantt Chart Library for Next.js

## Overview

Build a lightweight React/Next.js library for interactive Gantt charts. Starting from project scaffolding, we'll establish the rendering foundation with UTC-safe date handling, then add drag-and-drop interactions with performance optimization, and finally polish the developer experience with TypeScript, theming, and production readiness.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Core Rendering** - Static Gantt chart with monthly timeline and task bars
- [x] **Phase 2: Drag-and-Drop Interactions** - Interactive task manipulation via drag operations (completed 2003-02-19)

## Phase Details

### Phase 1: Foundation & Core Rendering
**Goal**: Working static Gantt chart displaying task bars on a monthly timeline
**Depends on**: Nothing (first phase)
**Requirements**: REND-01, REND-02, REND-03, REND-04, REND-05, API-01, API-04, DX-05, QL-03
**Success Criteria** (what must be TRUE):
  1. User sees a monthly calendar grid with date headers spanning the task date range
  2. User sees task bars positioned horizontally according to their start/end dates
  3. User sees task names displayed on or within each task bar
  4. User sees a vertical indicator line showing today's date
  5. User sees Excel-like table styling with grid lines and cell-based appearance
  6. Developer can render tasks by passing a simple array: `{ id, name, startDate, endDate, color? }`
  7. Component uses UTC internally to prevent DST bugs
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffolding and build setup
- [x] 01-02-PLAN.md — Date utilities and geometry engine (TDD)
- [x] 01-03-PLAN.md — Core rendering components (timeline, task bars, today indicator)

### Phase 2: Drag-and-Drop Interactions
**Goal**: Interactive task bar manipulation via drag with 60fps performance
**Depends on**: Phase 1
**Requirements**: INT-01, INT-02, INT-03, INT-04, API-02, QL-01, QL-02
**Success Criteria** (what must be TRUE):
  1. User can drag task bars horizontally to change start/end dates (move)
  2. User can drag task bar edges to change duration (resize)
  3. Component maintains smooth 60fps performance during drag operations with ~100 tasks
  4. Parent component receives callback with updated task data after drag completes
  5. Event listeners are properly cleaned up to prevent memory leaks
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Drag state management and hit detection
- [x] 02-02-PLAN.md — Move and resize interaction handlers
- [x] 02-03-PLAN.md — Performance optimization and testing

### Phase 3: Доработать календарную сетку: рисовать сетку на весь проект при перетягивании полос, столбцы в заголовке делать одной ширины, сделать трёхуровневый заголовок (год, месяц, день), добавить бледные вертикальные линии в календарную сетку, добавить яркие разделители месяцев и чуть менее яркие - недель, закрашивать бледно-розовым выходные дни

**Goal:** Multi-month calendar grid with two-row header (month names + day numbers), vertical grid lines, weekend highlighting, and synchronized header-body scrolling
**Depends on:** Phase 2
**Plans:** 4/4 plans executed (COMPLETE)

Plans:
- [x] 03-01-PLAN.md — Multi-month date utilities and calendar type definitions
- [x] 03-02-PLAN.md — GridBackground component for vertical lines and weekend highlighting
- [x] 03-03-PLAN.md — Two-row TimeScaleHeader with month names and day numbers
- [x] 03-04-PLAN.md — GanttChart integration with synchronized scrolling

### Phase 4: npm-packaging

**Goal:** Restructure the repo as an npm workspaces monorepo, extract the library into `packages/gantt-lib` (publishable as `gantt-lib`), and create a fresh `packages/website` demo site — proving the full install-and-use path works
**Depends on:** Phase 3
**Plans:** 5/5 plans executed (COMPLETE)

Plans:
- [x] 04-01-PLAN.md — Root monorepo scaffolding (workspaces package.json, turbo.json, shared tsconfig)
- [x] 04-02-PLAN.md — Library package config (gantt-lib package.json, tsup, tsconfig, vitest)
- [x] 04-03-PLAN.md — Website creation (Next.js 15 demo app, Modal moved to website-only)
- [x] 04-04-PLAN.md — Source migration (git mv, CSS modules → plain CSS, library index.ts)
- [x] 04-05-PLAN.md — Install, build, and verify (npm install, turbo build, dist artifact checks, human verify)

### Phase 5: progress-bars

**Goal:** Visual progress indicators on task bars showing completion status (0-100%) as horizontal fill overlays with color coding (darker shade for partial, yellow for 100% completed, green for 100% accepted)
**Depends on:** Phase 4
**Plans:** 1 plan

Plans:
- [ ] 05-01-PLAN.md — Progress bar type extensions, rendering logic, and CSS styles

### Phase 6: dependencies

**Goal:** Task dependencies with predecessor/successor relationships, four link types (FS, SS, FF, SF), lag support, cycle detection, and SVG-based Bezier curve visualization with arrows
**Depends on:** Phase 5
**Plans:** 1/4 plans executed

Plans:
- [ ] 06-01-PLAN.md — Dependency type definitions and utilities (cycle detection, link type calculations, validation)
- [ ] 06-02-PLAN.md — SVG-based DependencyLines component with Bezier curves
- [ ] 06-03-PLAN.md — GanttChart integration with drag validation and auto-schedule prop
- [ ] 06-04-PLAN.md — Demo page with dependency examples and unit tests
