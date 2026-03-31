---
status: awaiting_human_verify
trigger: "missing-hover-add-button: Пропала кнопка добавления новой задачи при hover на строку задачи после перехода к новой системе описания колонок (Phase 26)."
created: 2026-03-29T00:00:00Z
updated: 2026-03-29T12:30:00Z
---

## Current Focus

hypothesis: CONFIRMED - onInsertAfter PlusIcon button was lost during resolvedColumns refactor (commit 8479657, Phase 25-02)
test: Restored the missing PlusIcon button, tests pass
expecting: Hover "+" button should now appear on task rows
next_action: await human verification

## Symptoms

expected: При наведении курсора на строку задачи появляется кнопка "+" для добавления подзадачи
actual: Кнопка "+" не появляется при hover
errors: Нет ошибок в консоли (предположительно)
reproduction: Навести курсор на любую строку задачи в gantt-диаграмме
started: Началось после Phase 26 — миграция на новую систему описания колонок (columns API migration)

## Eliminated

## Evidence

- timestamp: 2026-03-29T12:00
  checked: Pre-refactor TaskListRow (commit 8479657^) vs current
  found: In old code, nameCell had `gantt-tl-name-actions` div containing onInsertAfter PlusIcon button BEFORE onDelete TrashIcon. In current code, only onDelete and HierarchyButton remain.
  implication: The onInsertAfter PlusIcon button was dropped during the resolvedColumns refactor

- timestamp: 2026-03-29T12:30
  checked: Restored PlusIcon button and ran addDeleteTask tests
  found: All 9 tests pass after fix applied
  implication: Fix does not break existing add/delete functionality

## Resolution

root_cause: Commit 8479657 (refactor(25-02): unify header and row rendering via resolvedColumns pipeline) dropped the onInsertAfter PlusIcon button from the nameCell actions div while extracting built-in cells into separate variables and rewriting the row render via resolvedColumns.map()
fix: Restored the onInsertAfter PlusIcon button in the nameCell's gantt-tl-name-actions div, matching the original implementation
verification: addDeleteTask tests pass (9/9)
files_changed: [packages/gantt-lib/src/components/TaskList/TaskListRow.tsx]
