---
gsd_state_version: 1.0
milestone: v0.50.0
milestone_name: Adding Tools
status: in_progress
last_updated: "2026-03-17T21:48:26.000Z"
last_activity: 2026-03-17 — Plan 21-01 completed (TDD RED phase)
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 4
  completed_plans: 1
---

## Current Position

**Phase:** 21 (Custom Weekend Calendar)
**Plan:** 21-02 (TDD GREEN phase)
**Status:** In progress
**Last activity:** 2026-03-17 — Created failing tests for createDateKey and createIsWeekendPredicate utilities

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Drag-and-drop task scheduling with Excel-like visual simplicity
**Current milestone:** v0.50.0 Adding Tools
**Milestone goal:** Add extensibility features — custom weekend calendar and additional TaskList columns

**Milestone features:**
- Custom weekend calendar (Date[] array + isWeekend predicate)
- Additional TaskList columns with renderCell/editor, positioned after Name column

## Accumulated Context

### Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Month-only view | Simplicity, covers "small projects" use case | ✓ Good — keeps library focused |
| Controlled component pattern | Fits React/Next.js patterns, user owns state | ✓ Good — flexible integration |
| UTC date handling | Prevents DST bugs | ✓ Good — proven correct |
| parentId-based hierarchy | Flat array structure, simpler than nested | ✓ Good — works well with drag-drop |
| shadcn/ui components | Modern, accessible, customizable | ✓ Good — DatePicker, Input integrated |
| Coarse granularity for v0.50.0 | 2 phases cover independent feature sets | ✓ Good — Custom Weekend Calendar + Additional Columns |
| TDD approach for utilities | Test-first development ensures API correctness | ✓ Good — RED phase complete (11 failing tests) |

### Technical Constraints

- **Tech Stack:** React/Next.js, TypeScript
- **Bundle Size:** Lightweight — minimal dependencies, tree-shakeable
- **Styling:** CSS with CSS variables — users can customize
- **Performance:** 60fps drag interactions on target scale
- **Browser:** Modern browsers — no IE11 requirement

### Known Issues

- Phase 16 plan 16-03 (demo page wiring) incomplete — minor gap

### User Feedback

None yet — no external users (library in active development)

### Roadmap Structure

**v0.50.0 phases (2 phases, 4 estimated plans):**
- Phase 21: Custom Weekend Calendar (CAL-01 to CAL-05)
- Phase 22: Additional TaskList Columns (COL-01 to COL-08)

**Coverage:** 13/13 requirements mapped ✓

## Session Continuity

**Previous session:** Completed v0.18.0 (Phases 1-20), released 2026-03-17

**Current focus:** Phase 21 Plan 21-02 (TDD GREEN phase)
- ✓ RED phase complete: 11 failing tests created
- Next: Implement createDateKey utility (4 tests to pass)
- Next: Implement createIsWeekendPredicate utility (7 tests to pass)
- Ensure all tests pass before moving to Plan 21-03

**Next:** Phase 21 Plan 21-03 (Integration)
- Implement weekends/workdays props in GanttChart
- Update GridBackground to use custom weekend predicate
- Update TimeScaleHeader to highlight custom weekends
- Update Calendar component to support custom weekends

**Later:** Phase 22 (Additional TaskList Columns)
- Implement `additionalColumns?: Column[]` prop
- Column interface: id, header, renderCell, editor?, width?, after?
- Position columns after specified base column
- Ensure scrolling works correctly

**Upcoming:** Plan 21-02 (Implement utilities - GREEN phase)

---

**State updated:** 2026-03-17
**Milestone:** v0.50.0 Adding Tools
