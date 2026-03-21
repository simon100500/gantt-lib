---
phase: quick
plan: 260321-dzb
subsystem: search-highlight-scroll
tags: [search, highlight, scroll, refactor]
completion_date: "2026-03-21T07:06:31Z"

# Dependency Graph
provides:
  - api: "GanttChartProps.highlightedTaskIds"
    description: "Set<string> prop for highlighting tasks in search results"
  - api: "GanttChartHandle.scrollToRow"
    description: "Method to scroll TaskList to a specific task row"
  - feature: "demo page search"
    description: "Search input field with Enter key scrolling"

affects:
  - component: "TaskList"
    changes: "Removed built-in search, now uses highlightedTaskIds prop for highlighting"
  - component: "GanttChart"
    changes: "Added highlightedTaskIds prop and scrollToRow method"

# Tech Stack
added:
  - "forwardRef pattern for TaskList"
  - "useImperativeHandle for scrollToRow"
patterns:
  - "Controlled component pattern (search state in parent)"
  - "Ref forwarding for imperative methods"

# Key Files
created: []
modified:
  - "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
  - "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
  - "packages/website/src/app/page.tsx"

# One-liner
Refactored search from TaskList to demo page: highlightedTaskIds prop for highlighting, scrollToRow method for programmatic scrolling, no filtering (all tasks remain visible).

# Decisions Made
## Почему поиск вынесен из TaskList в demo страницу
**Решение:** Поиск теперь живёт в пользовательском коде (demo странице), а не внутри TaskList.

**Обоснование:**
1. **Синхронизация grid и tasklist:** Встроенный поиск фильтровал задачи только в TaskList, нарушая синхронизацию с grid (разное количество строк).
2. **Правильная архитектура:** TaskList — компонент отображения, не должен содержать бизнес-логику поиска.
3. **Гибкость:** Пользователь библиотеки может реализовать любой поиск (по имени, дате, прогрессу) и передать highlightedTaskIds.

**Результат:** Подсветка задач без фильтрации — все задачи остаются на месте, синхронизация сохранена.

## Почему scrollToRow а не scrollToTask
**Решение:** Добавлен отдельный метод scrollToRow для прокрутки TaskList, в отличие от scrollToTask который прокручивает grid.

**Обоснование:**
1. **Разные цели:** scrollToTask прокручивает grid по горизонтали к дате задачи, scrollToRow прокручивает TaskList по вертикали к строке.
2. **Случай поиска:** При поиске нужно прокрутить TaskList к найденной задаче, чтобы пользователь видел её в списке.

**Результат:** Два независимых метода для разных видов прокрутки.

# Deviations from Plan
None - plan executed exactly as written.

# Auth Gates
None - no authentication required.

# Known Stubs
None.

# Performance Metrics
## Execution Time
Start: 2026-03-21T07:00:00Z (estimated)
End: 2026-03-21T07:06:31Z
Duration: ~6 minutes

## Tasks Completed
2 of 2 tasks (100%)

## Files Modified
3 files:
- TaskList.tsx: removed search state, added forwardRef and scrollToRow
- GanttChart.tsx: added highlightedTaskIds prop and scrollToRow method
- page.tsx: added search input and highlightedTaskIds calculation

## Commits
2 commits:
- b034950: feat(260321-dzb): Task 1 - rollback search and add highlightedTaskIds prop
- 0a68ec2: feat(260321-dzb): Task 2 - implement scrollToRow and add search demo

# Verification Results
## Automated Tests
✓ TypeScript compilation successful
✓ No build errors

## Manual Verification (pending)
- [ ] Search input accepts text
- [ ] Matching tasks are highlighted in TaskList (background color changed)
- [ ] Enter key scrolls TaskList to first matched task
- [ ] All tasks remain visible (no filtering)
- [ ] Grid and TaskList row counts match

# Next Steps
1. Manual verification of search functionality on demo page
2. Test with various search queries (single character, multiple matches, no matches)
3. Verify scrolling behavior with collapsed parent tasks

# Self-Check: PASSED
All commits exist in git log.
All files referenced in summary are present.
TypeScript compiles without errors.
