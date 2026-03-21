---
gsd_state_version: 1.0
milestone: v0.18
milestone_name: milestone
status: unknown
last_updated: "2026-03-19T21:53:34.922Z"
last_activity: 2026-03-19
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 9
  completed_plans: 9
  percent: 100
---

---
gsd_state_version: 1.0
milestone: v0.18
milestone_name: milestone
status: unknown
last_updated: "2026-03-19T19:20:00.000Z"
progress:
  [██████████] 100%
  completed_phases: 3
  total_plans: 7
  completed_plans: 7
---

## Current Position

Phase: 24 (buisiness-days) — EXECUTING
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

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260318-mso | 0% в прогрессе → "-", суффикс "д" для длительности | 2026-03-18 | [260318-mso-0](./quick/260318-mso-0/) |
| 260318-n0f | Вынос длительности за пределы узких полос (≤40px) | 2026-03-18 | [260318-n0f-1-1-5-100](./quick/260318-n0f-1-1-5-100/) |
| 260318-nji | Фикс отступов внешних меток rightLabels (gap вместо margin) | 2026-03-18 | [260318-nji-taskrow](./quick/260318-nji-taskrow/) |
| 260319-ofh | Move add connection button after chips (left-align connections) | 2026-03-19 | |
| 260319-uwn | Иерархическое добавление задач: кнопка '+' на родителе → после детей, на ребёнке → тот же родитель | 2026-03-19 | 69f27a0 | [260319-uwn-1-2-3](./quick/260319-uwn-1-2-3/) |
| 260319-w9n | добавить пропсы collapsedParentIds и onToggleCollapse для управления состоянием collapse/expand родительских задач | 2026-03-19 | 0be31d5 | [260319-w9n-collapsedparentids-ontogglecollapse-coll](./quick/260319-w9n-collapsedparentids-ontogglecollapse-coll/) |
| 260320-ht7 | Каскадный пересчёт зависимостей с учётом рабочих дней | 2026-03-20 | 1c675fd | [260320-ht7-business-days-calc](./quick/260320-ht7-business-days-calc/) |

| 260321-lag | РџРµСЂРµРІРµСЃС‚Рё workday-Р»РѕРіРёРєСѓ РЅР° lag-РєР°Рє-РёРЅРІР°СЂРёР°РЅС‚ Рё СЃРґРµР»Р°С‚СЊ businessDays РґРµС„РѕР»С‚РѕРј | 2026-03-20 | eb14476 | [260321-lag-planning-work-day-logic-md](./quick/260321-lag-planning-work-day-logic-md/) |
| 260321-dsr | Feature: Search Row Highlight & Scroll | 2026-03-21 | 90dda50 | [260321-dsr-feature-search-row-highlight-scroll](./quick/260321-dsr-feature-search-row-highlight-scroll/) |
| 260321-dzb | Fix search: highlight prop + scrollToRow method + demo search field | 2026-03-21 | b5ea781 | [260321-dzb-fix-search-highlight-prop-scrolltorow-me](./quick/260321-dzb-fix-search-highlight-prop-scrolltorow-me/) |

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
- Phase 24 added: buisiness-days

**Coverage:** 13/13 requirements mapped ✓

## Session Continuity

**Previous session:** Completed v0.18.0 (Phases 1-20), released 2026-03-17

**Current focus:** Phase 24 — buisiness-days

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

Last activity: 2026-03-20 - Completed quick task 260320-ht7: Каскадный пересчёт зависимостей с учётом рабочих дней

Last activity: 2026-03-21 - Completed quick task 260321-dzb: Fix search: highlight prop + scrollToRow method + demo search field

**State updated:** 2026-03-20
**Milestone:** v0.50.0 Adding Tools
