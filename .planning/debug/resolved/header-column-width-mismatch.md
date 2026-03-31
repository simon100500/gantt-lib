---
status: awaiting_human_verify
trigger: "header-column-width-mismatch: Ширина заголовков столбцов не совпадает с шириной самих столбцов после Phase 26"
created: 2026-03-29T00:00:00Z
updated: 2026-03-29T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED — Header cells в TaskList используют inline styles из BUILT_IN_COLUMN_WIDTHS, а body cells используют CSS классы с другими ширинами
test: Сравнить BUILT_IN_COLUMN_WIDTHS с CSS-классами для каждой built-in колонки
expecting: Расхождение в каждой колонке
next_action: Удалить inline style ширины из header cells, вернуть CSS-классы

## Symptoms

expected: Заголовки столбцов в TaskList sidebar должны иметь ту же ширину, что и соответствующие ячейки в body rows
actual: Ширина заголовков не совпадает с шириной body ячеек — визуально не выровнены
errors: Нет ошибок в консоли
reproduction: Открыть gantt-диаграмму и сравнить ширину заголовков TaskList с шириной ячеек в строках
started: После Phase 25 (commit 8479657) — unified header rendering via resolvedColumns pipeline, добавлены inline style ширины из BUILT_IN_COLUMN_WIDTHS

## Eliminated

## Evidence

- timestamp: 2026-03-29T00:01
  checked: createBuiltInColumns.tsx — BUILT_IN_COLUMN_WIDTHS
  found: number=40, name=200, startDate=90, endDate=90, duration=60, progress=50, dependencies=120, actions=80
  implication: Header inline styles берут ширину отсюда

- timestamp: 2026-03-29T00:01
  checked: TaskList.css — CSS классы для body cells
  found: gantt-tl-cell-number=32px, gantt-tl-cell-date=68px, gantt-tl-cell-duration=46px, gantt-tl-cell-progress=56px, gantt-tl-cell-deps=90px, gantt-tl-cell-name=flex:1 min-width:160px
  implication: Body cells используют ЗАХАРДКОЖЕННЫЕ CSS ширины, отличные от BUILT_IN_COLUMN_WIDTHS

- timestamp: 2026-03-29T00:01
  checked: TaskList.tsx header rendering (строки 871-931)
  found: Все header cells используют style={{ width: col.width, minWidth: col.width, flexShrink: 0 }} где col.width = BUILT_IN_COLUMN_WIDTHS
  implication: Header ширины = {40, 200, 90, 90, 60, 50, 120, 80} != CSS body ширины {32, flex, 68, 68, 46, 56, 90, 80}

- timestamp: 2026-03-29T00:01
  checked: git show 8479657^ — TaskList header ДО Phase 25
  found: ДО Phase 25 header cells использовали те же CSS классы (gantt-tl-cell-number, gantt-tl-cell-date, etc.) без inline style ширины
  implication: Phase 25 commit 8479657 сломал выравнивание, добавив inline style ширины из BUILT_IN_COLUMN_WIDTHS

- timestamp: 2026-03-29T00:01
  checked: TaskListRow.tsx built-in cells (строки 1598-2186)
  found: numberCell, nameCell, startDateCell, endDateCell, durationCell, progressCell, dependenciesCell — все используют CSS классы, НЕ inline styles
  implication: Body cells не используют BUILT_IN_COLUMN_WIDTHS вообще — они "привязаны" к CSS

## Resolution

root_cause: Commit 8479657 (Phase 25) заменил CSS-класс-based ширину header cells на inline styles из BUILT_IN_COLUMN_WIDTHS, которые отличаются от CSS-ширин body cells. До этого коммита header и body использовали одни и те же CSS классы.
fix: Убраны inline style width/minWidth из header cells для built-in columns (TaskList.tsx). CSS классы (gantt-tl-cell-number, gantt-tl-cell-date, gantt-tl-cell-duration, gantt-tl-cell-progress, gantt-tl-cell-deps) теперь контролируют ширину и header, и body одинаково.
verification: Build успешен. TS проверка без новых ошибок.
files_changed: [packages/gantt-lib/src/components/TaskList/TaskList.tsx]
