# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Drag-and-drop task scheduling with Excel-like visual simplicity
**Current focus:** Phase 4 - npm-packaging

## Current Position

Phase: 4 of 4 (npm-packaging)
Plan: 1 of ? in current phase (1 completed)
Status: In Progress - Monorepo foundation complete
Last activity: 2026-02-19 — Completed 04-01: Monorepo foundation

Progress: [███-------] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 9 min
- Total execution time: 1.28 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-core-rendering | 3 | 3 | 6 min |
| 02-drag-and-drop-interactions | 3 | 3 | 20 min |
| 03-calendar | 4 | 4 | 3 min |
| 04-npm-packaging | 1 | ? | 1 min |

**Recent Trend:**
- Last 5 plans: 01-01 (4 min), 01-02 (4 min), 01-03 (8 min), 02-01 (16 min), 02-02 (45 min), 02-03 (5 min), 03-01 (4 min)
- Trend: Variable

*Updated after each plan completion*
| Phase 03-calendar P04 | 2 minutes | 4 tasks | 3 files |
| Phase 03-calendar P03 | 2 minutes | 2 tasks | 2 files |
| Phase 03-calendar P01 | 4 minutes | 3 tasks | 6 files |
| Phase 02-drag-and-drop-interactions P03 | 5 minutes | 4 tasks | 5 files |
| Phase 02-drag-and-drop-interactions P02 | 45 minutes | 3 tasks + 2 fixes | 10 files |
| Phase 02-drag-and-drop-interactions P01 | 16 minutes | 2 tasks | 7 files |
| Phase 03-calendar P02 | 1 | 2 tasks | 3 files |
| Phase 03-calendar P03 | 2min | 2 tasks | 2 files |
| Phase 03-calendar P04 | 2min | 4 tasks | 3 files |
| Phase 04-npm-packaging P01 | 74 | 2 tasks | 4 files |
| Phase 04-npm-packaging P03 | 60 | 2 tasks | 8 files |
| Phase 04-npm-packaging P02 | 1 | 2 tasks | 4 files |

## Accumulated Context

### Roadmap Evolution

- Phase 3 added: Calendar grid improvements (full grid during drag, uniform column widths, three-level header, vertical grid lines, month/week separators, weekend highlighting)
- Phase 4 added: npm-packaging

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **CSS Grid for component layout:** Used CSS Grid with explicit column widths for predictable, Excel-like cell boundaries
- **React.memo with custom comparison on TaskRow:** Custom comparison function checks only task props that affect rendering
- **CSS Variables for theming:** All styling values exposed as CSS variables for consumer customization
- **'EEE d' date format:** Used date-fns format() with 'EEE d' pattern for clarity (e.g., "Mon 1")
- **UTC-only date arithmetic:** Used native Date.UTC() methods instead of date-fns for core logic (date-fns UTC methods had timezone inconsistencies)
- **Integer rounding for pixels:** All pixel values rounded with Math.round() to prevent sub-pixel rendering issues
- **Inclusive end dates:** +1 added to task duration calculations to include end date in span
- [Phase 01]: Use Next.js 15 with App Router (not Pages Router) for modern React patterns
- [Phase 01]: TypeScript strict mode enabled for maximum type safety
- [Phase 01]: date-fns for date handling (better than Moment.js for tree-shaking)
- [Phase 01]: Vitest over Jest for faster test execution and ESM support
- [Phase 02]: onChange callback fires only on mouseup (not during drag) - prevents parent state thrashing
- [Phase 02]: 16px cursor offset for DragTooltip to prevent obscuring drag target
- [Phase 02]: Full date format (d MMMM) for tooltip readability during drag
- [Phase 02]: Shadow-based hover feedback for 'tangible' feel over opacity changes
- [Phase 02]: Resize has priority over move when cursor is on edge zone (12px edge width)
- [Phase 02]: Fixed positioning for DragTooltip with z-index 1000 to stay above all elements
- [Phase 02]: React.memo with onChange excluded from comparison (relies on useCallback stability + onChange fires after drag)
- [Phase 02]: CSS transitions use !important during drag to ensure override of hover transitions
- [Phase 02]: @testing-library/react for renderHook in unit tests
- [Phase 02]: Removed onChange from React.memo comparison (relies on useCallback stability + onChange fires after drag only)
- [Phase 02]: Used !important on transition: none during drag to ensure override of hover transitions
- [Phase 03]: Two-row header layout with months on top, days below for better information density
- [Phase 03]: Russian locale (ru) for month names using date-fns format() with 'LLLL' pattern (standalone nominative case)
- [Quick 07]: Fixed month names to use 'LLLL' format for nominative case with capital letter
- [Phase 03]: Flexbox for month row (dynamic-width cells), CSS Grid for day row (fixed-width columns)
- [Phase 03]: Left-aligned month names, centered day numbers for visual hierarchy
- [Phase 03]: Hidden scrollbar pattern using CSS scrollbar-width: none for header scroll container
- [Phase 03]: Synchronized scrolling via scrollLeft assignment from task area onScroll to header scrollLeft
- [Phase 03]: Separate scroll refs (headerScrollRef, scrollContainerRef) for bidirectional sync capability
- [Phase 03]: Conditional TodayIndicator rendering based on todayInRange check to prevent unnecessary rendering
- [Quick 05]: External date labels positioned as siblings of taskBar using absolute positioning (right: 100% for left label, left: 100% for right label)
- [Quick 06]: Drag guide lines using absolute positioning with full grid height and parent-child callback coordination pattern
- [Phase 04]: Turborepo for monorepo task orchestration with build/dev/test/lint pipeline
- [Phase 04]: npm workspaces pattern using packages/* glob for package discovery
- [Phase 04]: Shared TypeScript base config without Next.js-specific options
- [Phase 04-npm-packaging]: Turborepo for monorepo task orchestration
- [Phase 04-npm-packaging]: npm workspaces pattern using packages/* glob
- [Phase 04-npm-packaging]: Shared TypeScript base config without Next.js-specific options
- [Phase 04-npm-packaging]: No transpilePackages in next.config.ts - library ships pre-compiled dist files
- [Phase 04-npm-packaging]: Modal component moved to website-only - not part of library API
- [Phase 04-npm-packaging]: Consumer CSS import pattern: import 'gantt-lib/styles.css' in layout.tsx
- [Phase 04-npm-packaging]: Workspace dependency syntax: "gantt-lib": "*" for npm workspaces

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Remove drag popup | 2026-02-19 | 6fa4ece | [1-remove-drag-popup](./quick/1-remove-drag-popup/) |
| 3 | Task bar date labels | 2026-02-19 | 8940b7c | [3-25-03](./quick/3-25-03/) |
| 5 | External date labels | 2026-02-19 | dbfd429 | [5-label](./quick/5-label/) |
| 6 | Drag guide lines | 2026-02-19 | 5632162 | [6-guide-lines](./quick/6-guide-lines/) |
| 7 | Fix month names to nominative case | 2026-02-19 | 16bf834 | [7-fix-month-names](./quick/7-fix-month-names/) |
| 9 | Vertical scrolling with sticky header | 2026-02-19 | 632eaae | [9-sticky](./quick/9-sticky/) |

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 04-01 - Monorepo foundation with Turborepo

**Phase 3 Status:** COMPLETE
- 03-01: COMPLETE - Multi-month date utilities and calendar type definitions (4 min)
- 03-02: COMPLETE - GridBackground component for vertical lines and weekend highlighting (1 min)
- 03-03: COMPLETE - Two-row TimeScaleHeader with month names and day numbers (2 min)
- 03-04: COMPLETE - GanttChart integration with synchronized scrolling (2 min)

**Phase 3 Total:** 4 plans, 9 min average, 3 calendar subsystem files enhanced

**Phase 4 Status:** IN PROGRESS
- 04-01: COMPLETE - Monorepo foundation (1 min)
