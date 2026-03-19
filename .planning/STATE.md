---
gsd_state_version: 1.0
milestone: v0.18
milestone_name: milestone
status: unknown
last_updated: "2026-03-19T14:35:00.000Z"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 7
  completed_plans: 7
---

## Current Position

Phase: 22 (filters) — EXECUTING
Plan: 1 of 2

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Drag-and-drop task scheduling with Excel-like visual simplicity
**Current milestone:** v0.50.0 Adding Tools
**Milestone goal:** Add extensibility features — custom weekend calendar, task filtering, and additional columns

**Milestone features:**

- Custom weekend calendar (Date[] array + isWeekend predicate)
- Task filtering by various criteria
- Additional TaskList columns with renderCell/editor

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

### Quick Tasks Completed

| # | Description | Date | Directory |
|---|-------------|------|-----------|
| 260318-mso | 0% в прогрессе → "-", суффикс "д" для длительности | 2026-03-18 | [260318-mso-0](./quick/260318-mso-0/) |
| 260318-n0f | Вынос длительности за пределы узких полос (≤40px) | 2026-03-18 | [260318-n0f-1-1-5-100](./quick/260318-n0f-1-1-5-100/) |
| 260318-nji | Фикс отступов внешних меток rightLabels (gap вместо margin) | 2026-03-18 | [260318-nji-taskrow](./quick/260318-nji-taskrow/) |
| 260319-ofh | Move add connection button after chips (left-align connections) | 2026-03-19 | |

### User Feedback

None yet — no external users (library in active development)

### Roadmap Structure

**v0.50.0 phases (4 phases, TBD estimated plans):**

- Phase 21: Custom Weekend Calendar (CAL-01 to CAL-05)
- Phase 21.1: custom-weekend-refactoring [INSERTED]
- Phase 22: filters
- Phase 23: Additional TaskList Columns (COL-01 to COL-08)

### Roadmap Evolution

- Phase 21.1 added: custom-weekend-refactoring
- Phase 22 added: filters (inserted between 21.1 and old 22)
- Old Phase 22 → Phase 23: Additional TaskList Columns (renumbered)

**Coverage:** 13/13 requirements mapped ✓

## Session Continuity

**Previous session:** Completed v0.18.0 (Phases 1-20), released 2026-03-17

**Current focus:** Phase 22 — filters

- ✓ 21-01: TDD RED phase — 11 failing tests created
- ✓ 21-02: TDD GREEN phase — utilities implemented (createDateKey, createIsWeekendPredicate)
- ✓ 21-03: Integration phase — props added to GanttChart, GridBackground, TimeScaleHeader, Calendar
- Next: 21-04: Demo page — examples of custom weekend usage

**Next:** Phase 21 Plan 21-04 (Demo page)

- Create demo page with custom weekend examples
- Show holidays, shifted workdays, custom predicates
- Visual verification of weekend highlighting and day number coloring

**Later:** Phase 22 (filters) and Phase 23 (Additional TaskList Columns)

- Phase 22: Task filtering by various criteria, Filter controls UI, Real-time filtered view updates
- Phase 23: Additional columns with renderers, editors, and positioning

**Upcoming:** Plan 21-04 (Demo page with custom weekend examples)

---

**State updated:** 2026-03-17
**Milestone:** v0.50.0 Adding Tools
