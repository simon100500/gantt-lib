---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-02-27T19:49:48.052Z"
progress:
  total_phases: 12
  completed_phases: 12
  total_plans: 33
  completed_plans: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Drag-and-drop task scheduling with Excel-like visual simplicity
**Current focus:** Phase 12 - task-list (planning complete)

## Current Position

Phase: 12 of 12 (12-task-list)
Plan: 2 of 2 in current phase (2 complete, 0 pending)
Status: COMPLETE - Task List overlay component with demo page
Last activity: 2026-02-27 - Completed 12-02 (TaskList demo page with toggle button)

Progress: [██████████] 100% (Phase 12: 2 of 2 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 29
- Average duration: 9 min
- Total execution time: 4.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-core-rendering | 3 | 3 | 6 min |
| 02-drag-and-drop-interactions | 3 | 3 | 20 min |
| 03-calendar | 4 | 4 | 3 min |
| 04-npm-packaging | 5 | 5 | 2.4 min |
| 05-progress-bars | 1 | 1 | 6 min |
| 06-dependencies | 2 | 4 | 5 min |
| 07-dependencies | 2 | 2 | 4 min |
| 08-ss-dependency | 3 | 3 | 4 min |
| 09-ff-dependency | 3 | 3 | 2 min |
| 10-sf-dependency | 1 | 1 | 4 min |
| 11-lock-task | 2 | 2 | 3 min |
| 12-task-list | 2 | 2 | 3 min |

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
| Phase 04-npm-packaging P01 | 74s | 2 tasks | 4 files |
| Phase 04-npm-packaging P03 | 60s | 2 tasks | 8 files |
| Phase 04-npm-packaging P02 | 65s | 2 tasks | 4 files |
| Phase 04-npm-packaging P04 | 3min | 2 tasks | 26 moved + 15 modified |
| Phase 04-npm-packaging P05 | 10min | 2 tasks + 1 fix | 6 files |
| Phase 05 P01 | 6 | 3 tasks | 5 files |
| Phase 06-dependencies P01 | 188 | 3 tasks | 4 files |
| Phase 06-dependencies P02 | 7 minutes | 2 tasks | 5 files |
| Phase 06-dependencies P03 | 4 minutes | 3 tasks | 3 files |
| Phase 07 P02 | 4 | 2 tasks | 3 files |
| Phase 08-ss-dependency P01 | 4 | 2 tasks | 3 files |
| Phase 08-ss-dependency P02 | 2min | 2 tasks | 1 files |
| Phase 08-ss-dependency P03 | 5min | 2 tasks | 1 files |
| Phase 09-ff-dependency P02 | 1min | 2 tasks | 1 files |
| Phase 09-ff-dependency P03 | 2min | 2 tasks | 6 files |
| Quick 020 P01 | 2min | 2 tasks | 2 files |
| Phase 09-ff-dependency P09-03 | 2min | 2 tasks | 6 files |
| Quick 021 P01 | 3min | 2 tasks | 2 files |
| Phase quick-022 P01 | 163 | 1 tasks | 1 files |
| Phase 10-sf-dependency P01 | 4min | 3 tasks | 2 files |
| Phase quick-023 P23 | 65 | 3 tasks | 1 files |
| Phase quick-024 P24 | 41s | 1 tasks | 1 files |
| Phase 11 P01 | 81 | 2 tasks | 5 files |
| Phase 11 P02 | 4min | 2 tasks | 1 files |
| Phase 26-props P26 | 3 | 2 tasks | 3 files |

## Accumulated Context

### Roadmap Evolution

- Phase 3 added: Calendar grid improvements (full grid during drag, uniform column widths, three-level header, vertical grid lines, month/week separators, weekend highlighting)
- Phase 4 added: npm-packaging
- Phase 5 added: progress-bars
- Phase 7 added: dependencies constraits
- Phase 8 added: SS dependency
- Phase 9 added: FF-dependency
- Phase 10 added: SF dependency
- Phase 11 added: lock-task
- Phase 12 added: task-list (overlay approach with inline editing)

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
- [Phase 04-npm-packaging]: Use git mv to preserve file history during migration
- [Phase 04-npm-packaging]: Rename .module.css to .css (drop CSS Modules)
- [Phase 04-npm-packaging]: Prefix all CSS class names to avoid collisions (gantt-*, gantt-tr-*, gantt-tsh-*, gantt-gb-*, gantt-ti-*, gantt-dgl-*)
- [Phase 04-npm-packaging]: CSS aggregator pattern: @import all component CSS into styles.css
- [Phase 04-npm-packaging]: Library index.ts imports styles.css to trigger tsup CSS emission
- [Phase 04-npm-packaging]: Use named import for esbuild-plugin-preserve-directives (not default)
- [Phase 04-npm-packaging]: CSS inlining for bundler emission (no @import statements)
- [Phase 04-npm-packaging]: CSS variables for theming customization
- [Phase 05]: Used color-mix() CSS function for darker progress shades from task color
- [Phase 07-01]: getSuccessorChain excludes dragged task (seeded in visited set) — prevents cascade override conflict with TaskRow's own drag state
- [Phase 07-01]: Hard-mode left boundary uses predecessor.startDate not endDate — allows negative lag (child can start before predecessor ends)
- [Phase 07-01]: Soft-mode lag delivered via updatedDependencies in onDragEnd result — reuses existing callback without new API surface
- [Phase 07-01]: onCascade and onDragEnd are mutually exclusive on drag complete — cascade takes precedence when chain.length > 0 in hard mode
- [Phase 07-01]: completeDrag() emits onCascadeProgress(new Map()) before completing — clears stale preview positions before onChange/onCascade fires
- [Phase 07-02]: overridePosition uses nullish coalescing: overridePosition?.left ?? (isDragging ? currentLeft : left) — cascade override beats drag and static position
- [Phase 07-02]: arePropsEqual compares overridePosition.left and .width separately — critical for React.memo re-render of chain tasks during cascade drag
- [Phase 07-02]: handleCascade in GanttChart uses functional onChange updater to merge cascaded tasks without stale closure
- [Phase 08-01]: getSuccessorChain default linkTypes=['FS'] preserves all Phase 7 callers without change
- [Phase 08-01]: SS lag clamped at 0 via Math.max — predecessor can never finish after successor in SS semantics
- [Phase 08-01]: recalculateIncomingLags SS is private; tested indirectly via handleComplete soft-mode path
- [Phase 08-02]: Mode filtering at cascade emission time (not drag start) to avoid storing mode state at assignment
- [Phase 08-02]: SS lag floor (Math.max) applied only in move and resize-left modes — resize-right never changes startA
- [Phase 08-02]: Dual-delta approach: detect resize-right by checking deltaFromStart === 0 (startDate unchanged)
- [Phase 08-02]: chainForCompletion uses ['FS','SS'] when startDate moved, ['FS'] when only endDate moved
- [Phase 09-02]: cascadeChainEnd (FS+FF) for resize-right cascade — endA changes, SS unaffected
- [Phase 09-02]: cascadeChain includes FF (FS+SS+FF) for move mode — all link types follow startA shift
- [Phase 09-02]: SS lag floor remains applied to all activeChain tasks — FF negative lag preview acceptable, real lag recalculated on completion
- [Phase 09-02]: chainForCompletion includes FF for resize-right and move modes, excludes FF for resize-left
- [Phase 09-03]: FF cascade preview positioned from chainEndOffset (not chainStartOffset) — fixes visual jump with negative lag
- [Phase 09-03]: SS lag floor (Math.max) applied only to SS tasks, not FF tasks — allows FF negative lag in mixed chains
- [Phase 09-ff-dependency]: FF cascade preview positioned from chainEndOffset (not chainStartOffset) to fix visual jump with negative lag
- [Phase 09-ff-dependency]: SS lag floor applied only to SS tasks, not FF tasks, allowing FF negative lag in mixed chains
- [Phase 10-01]: SF cascade preview uses end-based positioning (like FF) because SF constrains endB to startA
- [Phase 10-01]: SF constraint clamp affects width (not left) because it constrains endB, not startB
- [Phase 10-01]: SF lag uses Math.min(0, ...) for ceiling (opposite of SS's Math.max(0, ...) floor)
- [Phase 10-01]: Renamed cascadeChainSS to cascadeChainStart for clarity (SS+SF share start-based cascade behavior)
- [Phase 12-01]: TaskList overlay uses position: sticky within existing scroll container — avoids complex cross-container scroll synchronization
- [Phase 12-01]: Inline editing pattern uses useState + useEffect for auto-focus, standard Enter/blur save, Escape cancel behavior
- [Phase 12-01]: Date format conversion — display as DD.MM.YY, edit as DD.MM.YY, store as YYYY-MM-DD (ISO)
- [Phase 12-01]: TaskList CSS uses gantt-tl- prefix following project convention
- [Phase 12-01]: Overlay z-index: 5 (above grid: 0, below guide lines: 20)
- [Phase 12-01]: Task list toggle controlled externally via showTaskList prop (not internal to GanttChart component)
- [Phase 12-01]: Row selection state tracked in GanttChart (selectedTaskId), shared with TaskList and TaskRow

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
| 10 | Update README for monorepo and npm package | 2026-02-19 | c90c399 | [10-readme](./quick/10-readme/) |
| 11 | Fix DependencyLines huge arrowhead and wrong path start position | 2026-02-21 | dd1b160 | [11-fix-dependencylines-component-huge-arrow](./quick/11-fix-dependencylines-component-huge-arrow/) |
| 12 | Fix FS negative-lag drag snap-back + disableConstraints toggle | 2026-02-21 | 62e2cb2 | [12-fs](./quick/12-fs/) |
| 14 | Сделай корректное отображение связей (bidirectional dependency line rendering) | 2026-02-21 | 58f3564 | [14-worktree-workterr](./quick/14-worktree-workterr/) |
| 15 | Redraw dependency lines in real-time during drag | 2026-02-22 | f530164 | [015-redraw-dep-lines-on-drag](./quick/015-redraw-dep-lines-on-drag/) |
| 16 | Add 7 FS dependency links to Construction Project demo | 2026-02-22 | 58041eb | [16-6-7](./quick/16-6-7/) |
| 17 | SS/FF/SF dependency line rendering (type-aware connection points) | 2026-02-22 | 133d8cc | [17-fs-ss-sf-ff](./quick/17-fs-ss-sf-ff/) |
| 19 | Apply FS left-edge constraint to resize-left mode | 2026-02-22 | af6261e | [19-fs](./quick/19-fs/) |
| 20 | Progress percentage display with intelligent positioning | 2026-02-22 | 5296367 | [020-progress-percent](./quick/020-progress-percent/) |
| 21 | Add lag number display to dependency connection lines | 2026-02-22 | 66f488d | [21-add-small-lag-number-in-days-to-connecti](./quick/21-add-small-lag-number-in-days-to-connecti/) |
| 22 | Lag label direction-aware vertical positioning | 2026-02-22 | 2ff0591 | [022-lag-label-above-line](./quick/022-lag-label-above-line/) |
| 23 | README dependency documentation | 2026-02-22 | 828b404 | [23-readme-s](./quick/23-readme-s/) |
| 24 | JSON export button (id, name, startDate, endDate, progress, accepted, dependencies) | 2026-02-22 | 1a9b1c3 | [24-json-id-name-startdate-enddate-progress-](./quick/24-json-id-name-startdate-enddate-progress-/) |
| 25 | Complete API reference documentation for gantt-lib v0.0.8 | 2026-02-22 | 5083cdb | [25-docs](./quick/25-docs/) |
| 26 | Optional horizontal divider line for visual task grouping | 2026-02-23 | e5eb192 | [26-props](./quick/26-props/) |
| 27 | создай ещё одну тестовую страницу с графиком по роуту /mcp и чтобы задачи брались из json файла рядом в этой папке (или любой допустимой в проекте), создай пример json на 3 работы | 2026-02-23 | 6f82c8e | [27-mcp-json-json-3](./quick/27-mcp-json-json-3/) |
| 28 | TaskList 400px default, name text wrap, native date picker for date cells | 2026-02-27 | 9c4ff04 | [28-task-list-400px-datepicker](./quick/28-task-list-400px-datepicker/) |

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed quick-028 (TaskList 400px default, name wrap, native date picker)

**Phase 3 Status:** COMPLETE
- 03-01: COMPLETE - Multi-month date utilities and calendar type definitions (4 min)
- 03-02: COMPLETE - GridBackground component for vertical lines and weekend highlighting (1 min)
- 03-03: COMPLETE - Two-row TimeScaleHeader with month names and day numbers (2 min)
- 03-04: COMPLETE - GanttChart integration with synchronized scrolling (2 min)

**Phase 3 Total:** 4 plans, 9 min average, 3 calendar subsystem files enhanced

**Phase 4 Status:** COMPLETE
- 04-01: COMPLETE - Monorepo foundation (1 min)
- 04-02: COMPLETE - Library package scaffolding (1 min)
- 04-03: COMPLETE - Website package creation (1 min)
- 04-04: COMPLETE - Library source migration (3 min)
- 04-05: COMPLETE - Build and verify library (10 min)

**Phase 4 Total:** 5 plans, 2.4 min average, complete npm package with CJS + ESM bundles

**Phase 5 Status:** CHECKPOINT - AWAITING VERIFICATION
- 05-01: CHECKPOINT - Progress bars on task bars (6 min + 1 fix)

**Phase 5 Total:** 1 plan, 6 min, progress visualization with completion status colors

**Phase 6 Status:** IN_PROGRESS
- 06-01: COMPLETE - Dependency type definitions and core utilities (3 min)
- 06-02: COMPLETE - Dependency Lines Visualization Component (7 min)
- 06-03: COMPLETE - Integration with drag constraint validation (4 min)

**Phase 6 Total:** 3 of 4 plans, 5 min avg, dependency types with DFS-based cycle detection and SVG-based Bezier curve visualization

**Phase 7 Status:** IN_PROGRESS
- 07-01: COMPLETE - Cascade chain engine: getSuccessorChain BFS traversal + cascade delta emission + soft-mode lag recalculation (4 min)

**Phase 7 Total:** 1 of 3 plans, 4 min so far, algorithmic core of FS cascade constraint system

**Phase 8 Status:** COMPLETE
- 08-01: COMPLETE - SS dependency utility foundations: getSuccessorChain linkTypes + recalculateIncomingLags SS formula (4 min)
- 08-02: COMPLETE - SS constraint enforcement in useTaskDrag: split chains, mode-aware cascade, SS lag floor, dual-delta handleComplete (2 min)
- 08-03: COMPLETE - SS demo tasks added to Construction Project, all 8 SS interaction scenarios human-verified (5 min)

**Phase 8 Total:** 3 of 3 plans, ~4 min avg, full SS dependency support — utility foundations, constraint enforcement, and end-to-end verification

**Phase 9 Status:** COMPLETE
- 09-01: COMPLETE - Extend recalculateIncomingLags with newEndDate parameter and FF case (2 min)
- 09-02: COMPLETE - FF constraint enforcement in useTaskDrag: cascadeChainEnd, FF cascade emission, FF-aware completion (1 min)
- 09-03: COMPLETE - FF dependency demo tasks in Construction Project + human verification (2 min + bug fix)

**Phase 9 Total:** 3 of 3 plans, ~2 min avg, full FF dependency support — lag recalculation, constraint enforcement, demo tasks, and end-to-end verification with negative lag support

**Phase 10 Status:** COMPLETE
- 10-01: COMPLETE - SF dependency constraint enforcement (4 min)

**Phase 10 Total:** 1 of 1 plans, 4 min, SF dependency support — constraint clamp, lag ceiling, and cascade chains

**Phase 11 Status:** COMPLETE
- 11-01: COMPLETE - Task lock feature implementation (81s, 5 files)
- 11-02: COMPLETE - Locked tasks demo with human verification (4 min, 1 file)

**Phase 11 Total:** 2 of 2 plans, ~3 min avg, complete lock-task feature — locked prop, hook guard, lock icon, cascade filtering, and human verification

**Phase 12 Status:** COMPLETE
- 12-01: COMPLETE - TaskList component: core structure, inline editing, CSS styles, GanttChart integration (5 min)
- 12-02: COMPLETE - CSS aggregation, library exports, demo page with toggle button (1 min)

**Phase 12 Total:** 2 of 2 plans complete, Task List overlay component with inline editing, synchronized scrolling, and demo page

