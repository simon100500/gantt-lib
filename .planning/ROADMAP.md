# Roadmap: Gantt Chart Library for Next.js

## Overview

Build a lightweight React/Next.js library for interactive Gantt charts. Starting from project scaffolding, we'll establish the rendering foundation with UTC-safe date handling, then add drag-and-drop interactions with performance optimization, and finally polish the developer experience with TypeScript, theming, and production readiness.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Core Rendering** - Static Gantt chart with monthly timeline and task bars
- [ ] **Phase 2: Drag-and-Drop Interactions** - Interactive task manipulation via drag operations
- [ ] **Phase 3: Polish & Developer Experience** - Production-ready library with TypeScript and distribution

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
**Plans**: TBD

Plans:
- [ ] 02-01: Drag state management and hit detection
- [ ] 02-02: Move and resize interaction handlers
- [ ] 02-03: Performance optimization (React.memo, state isolation)

### Phase 3: Polish & Developer Experience
**Goal**: Production-ready library with excellent TypeScript support and distribution
**Depends on**: Phase 2
**Requirements**: API-03, DX-01, DX-02, DX-03, DX-04
**Success Criteria** (what must be TRUE):
  1. Developer gets full TypeScript support with exported types
  2. Developer can install component with minimal dependencies
  3. Bundle size is under 15KB gzipped
  4. Component works as Next.js App Router client component
  5. Developer can customize colors via CSS variables
  6. API surface is simple: `<Gantt tasks={tasks} onChange={handleTasksChange} />`
**Plans**: TBD

Plans:
- [ ] 03-01: TypeScript types and API surface
- [ ] 03-02: CSS theming with CSS variables
- [ ] 03-03: Bundle optimization and distribution setup
- [ ] 03-04: Next.js App Router compatibility verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Core Rendering | 3/3 | Complete | 2026-02-19 |
| 2. Drag-and-Drop Interactions | 0/3 | Not started | - |
| 3. Polish & Developer Experience | 0/4 | Not started | - |
