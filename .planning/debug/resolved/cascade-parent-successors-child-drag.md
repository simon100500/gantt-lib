---
status: awaiting_human_verify
trigger: "При сдвижке ребёнка (g2-5) его последователь (g3-1) двигается только на 1 день, а при drop возвращается на место"
created: 2026-03-16T10:00:00.000Z
updated: 2026-03-16T10:25:00.000Z
---

## Current Focus
hypothesis: FIX APPLIED - Добавил draggedChild в overrides после строки 811 (useTaskDrag.ts)
test: Проверить в демо: при drag ребёнка g2-5 родитель g2 должен расширяться, а последователь g3-1 должен сдвигаться
expecting: При drag вправо на N дней: parent g2 расширится на N дней, successor g3-1 сдвинется на N дней
next_action: Дождаться проверки пользователем

## Symptoms
expected: При drag ребёнка родительский таск должен расширяться/сдвигаться, а его последователи - каскадно сдвигаться на всё расстояние drag
actual: Последователь (g3-1) сдвигается только на 1 день, затем при drop возвращается в исходную позицию. Родитель (g2) остаётся на месте (day 15-28) независимо от deltaDays
errors: Нет ошибок в консоли
reproduction:
1. Открыть демо
2. Взять ребёнка g2-5 и сдвинуть его вправо на несколько дней
3. Наблюдать: g3-1 сдвигается только на 1 день, затем возвращается
timeline: Баг появился после добавления cascade parent sync для child drag (Phase 19)

## Evidence
- timestamp: 2026-03-16T10:00:00
  checked: Код useTaskDrag.ts строки 710-850
  found: В строках 734-738 есть логика использования newLeft для draggedChild при расчёте parent position
  implication: Логика существует в одном месте (строки 721-781), но НЕ используется в parent sync loop (строки 857-901)

- timestamp: 2026-03-16T10:00:00
  checked: Структура кода в разделе child drag
  found:
    - Строки 680-811: Построение overrides для activeChain (включая draggedChild?)
    - Строка 810: `overrides.set(chainTask.id, { left: chainLeft, width: chainWidth });`
    - Строки 819-851: Формирование cascadeParentIds
    - Строки 857-901: Parent sync loop (ПРОБЛЕМА: здесь draggedChild может отсутствовать в overrides!)
  implication: Родительский sync использует overrides, но draggedChild может быть добавлен ПОСЛЕ этого loop

- timestamp: 2026-03-16T10:15:00
  checked: Формирование activeChain при child drag (строки 1466-1516)
  found:
    - Строка 1503: cascadeChain = getTransitiveCascadeChain(taskId, ...) = последователи dragged task
    - Строки 1474-1479: При child drag hierarchyChain = [родитель]
    - Строки 287-292: activeChain = cascadeChain + hierarchyChain
    - **КЛЮЧЕВОЕ**: draggedChild НЕ входит ни в cascadeChain, ни в hierarchyChain!
  implication: В строке 680 `for (const chainTask of activeChain)` draggedChild НЕ обрабатывается, поэтому НЕ добавляется в overrides

- timestamp: 2026-03-16T10:15:00
  checked: Parent sync loop (строки 857-901)
  found:
    - Строка 860: `const children = getChildren(pid, allTasks);` - получает всех детей parent
    - Строка 866: `if (overrides.has(child.id))` - проверяет, есть ли child в overrides
    - Для draggedChild: overrides.has('g2-5') = FALSE
    - Строки 873-887: Использует исходную позицию из child.startDate/child.endDate
  implication: Parent sync использует ИСХОДНУЮ позицию draggedChild вместо текущей позиции drag (newLeft/newWidth)

- timestamp: 2026-03-16T10:15:00
  checked: Logs из symptoms
  found:
    - `deltaDays: 0 → 1 → 2 → 3 → 4` - drag сдвигается
    - `NEW position: day 15 to 28` - parent position НЕ ИЗМЕНЯЕТСЯ
    - Это подтверждает: parent sync использует исходную позицию draggedChild
  implication: Logs подтверждают root cause

## Eliminated

## Resolution
root_cause: При child drag draggedChild НЕ добавляется в activeChain (строки 281-292), поэтому НЕ попадает в overrides (строка 810). Parent sync loop (строки 857-901) проверяет overrides.has(draggedChild.id) = FALSE и использует исходную позицию draggedChild вместо текущей позиции drag (newLeft/newWidth). Результат: parent position остаётся статичной, несмотря на движение ребёнка.
fix: Добавить draggedChild в overrides ПЕРЕД parent sync loop (после строки 811, перед DEBUG log). Использовать newLeft/newWidth для позиции draggedChild. Код:
```typescript
// CRITICAL FIX: Add dragged child to overrides BEFORE parent sync
if (!overrides.has(draggedTaskId)) {
  overrides.set(draggedTaskId, { left: newLeft, width: newWidth });
}
```
verification: Ожидает проверки пользователем
files_changed: ["packages/gantt-lib/src/hooks/useTaskDrag.ts"]
