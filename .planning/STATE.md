# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Drag-and-drop task scheduling with Excel-like visual simplicity
**Current focus:** Phase 2 - Drag-and-Drop Interactions

## Current Position

Phase: 2 of 2 (Drag-and-Drop Interactions)
Plan: 3 of 3 in current phase
Status: Plan 02-03 complete
Last activity: 2026-02-19 — Performance optimization and testing complete

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 11 min
- Total execution time: 1.02 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-core-rendering | 3 | 3 | 6 min |
| 02-drag-and-drop-interactions | 3 | 3 | 20 min |

**Recent Trend:**
- Last 5 plans: 01-01 (4 min), 01-02 (4 min), 01-03 (8 min), 02-01 (16 min), 02-02 (45 min), 02-03 (5 min)
- Trend: Variable

*Updated after each plan completion*
| Phase 02-drag-and-drop-interactions P03 | 5 minutes | 4 tasks | 5 files |
| Phase 02-drag-and-drop-interactions P02 | 45 minutes | 3 tasks + 2 fixes | 10 files |
| Phase 02-drag-and-drop-interactions P01 | 16 minutes | 2 tasks | 7 files |
| Phase 01-foundation-core-rendering P01 | 8 minutes | 5 tasks | 12 files |
| Phase 02-drag-and-drop-interactions P03 | 5 | 4 tasks | 5 files |

## Accumulated Context

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 02-03-PLAN.md
Resume file: .planning/phases/02-drag-and-drop-interactions/02-03-SUMMARY.md
