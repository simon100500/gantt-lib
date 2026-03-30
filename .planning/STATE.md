---
gsd_state_version: 1.0
milestone: v0.18.0
milestone_name: milestone
status: Ready to execute
last_updated: "2026-03-30T20:00:00.017Z"
last_activity: 2026-03-30
progress:
  total_phases: 8
  completed_phases: 7
  total_plans: 20
  completed_plans: 19
---

## Current Position

Phase: 27 (core-refactor) — EXECUTING
Plan: 2 of 2

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Drag-and-drop task scheduling with Excel-like visual simplicity
**Current milestone:** v0.50.0 Adding Tools
**Milestone goal:** Add extensibility features — custom weekend calendar, task filtering, and additional columns

**Milestone features:**

- Custom weekend calendar (Date[] array + isWeekend predicate)
- Task filtering by various criteria
- Additional TaskList columns with renderCell/renderEditor

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
| Type alias intersection for union types | TypeScript doesn't support interface extends union (TS2312) | ✓ Good — used `type X = Union & { ... }` pattern |
| Tracked insertion positions per anchor | Prevents same-anchor column order reversal | ✓ Good — Map<string, number> tracks last insert index |
| Single editingColumnId state | One state for all editors, derived booleans for compat | ✓ Good — eliminates multi-editor race condition (Phase 25-03) |

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

| 260321-lag | Перевести workday-логику на lag-как-инвариант и сделать businessDays дефолтом | 2026-03-20 | eb14476 | [260321-lag-planning-work-day-logic-md](./quick/260321-lag-planning-work-day-logic-md/) |
| 260322-oi0 | Добавить возможность скрытия тасклиста отдельно от календаря | 2026-03-22 | f06f820 | [260322-oi0](./quick/260322-oi0/) |
| 260323-pud | Split REFERENCE.md into modular chapter structure (12 chapters + INDEX) | 2026-03-23 | ab4ca21 | [260323-pud](./quick/260323-pud-md-d-projects-gantt-lib-docs-reference-m/) |

### User Feedback

None yet — no external users (library in active development)

### Roadmap Structure

**v0.50.0 phases (4 integer phases + 1 inserted decimal phase, TBD estimated plans):**

- Phase 21: Custom Weekend Calendar (CAL-01 to CAL-05)
- Phase 21.1: custom-weekend-refactoring [INSERTED]
- Phase 22: filters
- Phase 23: Additional TaskList Columns (COL-01 to COL-08)
- Phase 24: buisiness-days
- Phase 25: columns-refactoring (4 plans, 4 waves)

### Roadmap Evolution

- Phase 21.1 added: custom-weekend-refactoring
- Phase 22 added: filters (inserted between 21.1 and old 22)
- Old Phase 22 → Phase 23: Additional TaskList Columns (renumbered)
- Phase 24 added: buisiness-days
- Phase 25 added: columns-refactoring
- Phase 27 added: core-refactor

**Coverage:** 13/13 requirements mapped ✓

## Session Continuity

**Previous session:** Completed v0.18.0 (Phases 1-20), released 2026-03-17

**Current focus:** Phase 27 — core-refactor

- ✓ 25-01: Structural foundations — new types, resolver with TDD, backward-compatible bridge
- ✓ 25-02: Render unification — createBuiltInColumns factory, header/body via resolvedColumns.map()
- ✓ 25-03: Editor unification — single editingColumnId replaces 4 separate states
- ✓ 25-04: Generic tightening — (source changes superseded by Waves 1-3 architecture)

**Next:** Verification

---

Last activity: 2026-03-30

**State updated:** 2026-03-29
**Milestone:** v0.50.0 Adding Tools
