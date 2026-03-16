---
status: awaiting_human_verify
trigger: "При drop child drag изменения не сохраняются для родителя и его последователей"
created: 2026-03-16T10:30:00.000Z
updated: 2026-03-16T11:05:00.000Z
---

## Current Focus
hypothesis: FIX ПРИМЕНЁН - Добавлен массив hierarchyCascadeTasks для родителя и его последователей. Они вычисляются с новыми датами и добавляются в cascadedTasks БЕЗ повторного применения deltaDays.
test: Проверить в демо: при drop child drag родитель и его последователи должны сохранять новые позиции
expecting: При drop g2-5 вправо на 5 дней: родитель g2 сохраняет расширенную позицию, successor g3-1 сохраняет сдвинутую позицию
next_action: Дождаться проверки пользователем

## Symptoms
expected: При drop child drag родитель (g2) и его последователи должны сохранять новые позиции
actual: При drop всё возвращается в исходное состояние. Визуально при drag работает, но изменения не сохраняются
errors: Нет ошибок в консоли
reproduction:
1. Открыть демо
2. Взять ребёнка g2-5 и сдвинуть вправо на 5 дней
3. Визуально: родитель g2 расширяется (day 15-33), g3-1 сдвигается (day 35-39)
4. Drop: всё возвращается (g2: day 15-28, g3-1: day 30-34)
started: Баг появился после добавления cascade parent sync для child drag (Phase 19)

## Evidence

## Полная иерархия сущностей при Child Drag

### Диаграмма зависимостей

```
           [g1] (task)
             | FS
             v
           [g2] (parent task)
          /      \
    (children)   | FS
    g2-1  g2-5  v
              [g3-1] (task)
                 | FS
                 v
              [g4] (на示意图可能有后续)
```

### Сущности при drag g2-5

| Роль | ID | Тип | Описание |
|------|----|----|----------|
| **draggedTask** | g2-5 | child | Перетаскиваемая задача |
| **hierarchyParent** | g2 | parent | Родитель draggedChild (вычисляется из parentId) |
| **successor** | g3-1 | task | Прямой successor g2 (FS link) |
| **successorOfSuccessor** | g4 | task | Последователь g3-1 (если есть) |

### Поток данных: MouseDown → Drag → Drop

#### 1. MOUSE DOWN (handleMouseDown, строки 1380-1550)

```typescript
// Строка 1474-1484: Build hierarchy chain
const currentTask = allTasks.find(t => t.id === taskId);
let hierarchyChain: Task[] = [];
if (currentTask) {
  const taskParentId = (currentTask as any).parentId;
  if (taskParentId) {
    // Dragging a child - include parent for real-time updates
    const parentTask = allTasks.find(t => t.id === taskParentId);
    if (parentTask) {
      hierarchyChain.push(parentTask); // ✅ g2 добавлен в hierarchyChain
    }
  }
}

// Строка 1496: cascadeChain = successors of g2-5
cascadeChain: getTransitiveCascadeChain(taskId, allTasks, ['FS', 'SS', 'FF', 'SF'])
// Результат: cascadeChain = [g3-1, g4, ...] ( successors draggedChild)
// ВАЖНО: g2 НЕ в cascadeChain, потому что g2 не successor g2-5!

// Строка 1507: Сохранение в globalActiveDrag
globalActiveDrag = {
  ..., cascadeChain, hierarchyChain, ...
};
```

**Что в globalActiveDrag при drag g2-5:**
- `cascadeChain`: [g3-1, g4, ...] (successors of g2-5)
- `hierarchyChain`: [g2] (parent of g2-5)
- `draggedTaskId`: "g2-5"

#### 2. DRAG PROGRESS (handleProgress, строки 260-990)

```typescript
// Строки 287-292: Merge chains
let activeChain = activeDrag.cascadeChain; // [g3-1, g4, ...]
if (activeDrag.hierarchyChain.length > 0) {
  const chainIds = new Set(activeChain.map(t => t.id));
  const hierarchyTasks = activeDrag.hierarchyChain.filter(t => !chainIds.has(t.id));
  activeChain = [...activeChain, ...hierarchyTasks]; // [g3-1, g4, ..., g2]
}
// activeChain теперь содержит: [g3-1, g4, ..., g2]

// Строки 680-811: Build overrides
for (const chainTask of activeChain) {
  // ... вычисление новых позиций
  overrides.set(chainTask.id, { left: chainLeft, width: chainWidth });
}
// ВОПРОС: draggedChild (g2-5) обрабатывается?

// Строки 856-901: Parent sync loop
for (const pid of cascadeParentIds) { // cascadeParentIds = ['g2']
  const children = getChildren(pid, allTasks); // [g2-1, g2-5, ...]
  // ... вычисление parent position от children
  // ✅ g2 позиция обновляется в overrides
}
// ВИЗУАЛЬНО РАБОТАЕТ: g2 расширяется, g3-1 сдвигается
```

**Что работает:**
- `overrides` содержит: { g2: {left, width}, g3-1: {left, width}, ... }
- `onCascadeProgress` вызывается с overrides
- UI показывает правильные позиции

#### 3. DROP / COMPLETE (handleComplete, строки 1220-1400)

**БЫЛО (до фикса):**
```typescript
// Строки 1327-1339: Build completion chain
let chainForCompletion = getTransitiveCascadeChain('g2-5', allTasks, [...]);
// Результат: chainForCompletion = [g3-1, g4, ...] (ТОЛЬКО successors)
// ПРОБЛЕМА: g2 (parent) НЕ включён!

// Строки 1341-1354: Merge hierarchy children (для parent drag, не для child!)
const hierarchyChildren = getChildren('g2-5', allTasks); // [] (у g2-5 нет детей)
// chainForCompletion по-прежнему = [g3-1, g4, ...] (g2 отсутствует!)

// Строки 1357-1385: Build cascadedTasks
const cascadedTasks: Task[] = [
  draggedChild (g2-5), // ✅
  ...chainForCompletion // [g3-1, g4, ...] ❌ g2 отсутствует!
];
onCascade(cascadedTasks); // ❌ g2 НЕ сохраняется → возвращается в исходное состояние
```

**СТАЛО (после фикса):**
```typescript
// Строки 1341-1409: Build hierarchyCascadeTasks
if (currentTask && (currentTask as any).parentId) {
  const parentId = (currentTask as any).parentId; // 'g2'
  const parentTask = allTasks.find(t => t.id === parentId);

  // Вычисляем новые даты родителя от детей (включая draggedChild с НОВОЙ позицией)
  const childrenWithNewPos = siblings.map(child => {
    if (child.id === taskId) {
      return { ...child, startDate: newStartDate, endDate: newEndDate }; // ✅ Новая позиция!
    }
    return child;
  });

  // Compute parent's NEW dates
  const parentNewStart = min(childrenWithNewPos.startDate);
  const parentNewEnd = max(childrenWithNewPos.endDate);
  const parentDeltaDays = parentNewStart - parentTask.startDate;

  // ✅ Добавляем родителя в hierarchyCascadeTasks
  hierarchyCascadeTasks.push({
    ...parentTask,
    startDate: parentNewStart.toISOString(),
    endDate: parentNewEnd.toISOString(),
  });

  // ✅ Добавляем successors родителя
  const parentSuccessors = getTransitiveCascadeChain(parentId, allTasks, [...]);
  for (const successor of parentSuccessors) {
    hierarchyCascadeTasks.push({
      ...successor,
      startDate: successor.startDate + parentDeltaDays,
      endDate: successor.endDate + parentDeltaDays,
    });
  }
}

// Строки 1413-1439: Build cascadedTasks с hierarchyCascadeTasks
const cascadedTasks: Task[] = [
  draggedChild (g2-5), // ✅
  ...hierarchyCascadeTasks, // ✅ [g2 (new dates), g4 (shifted), ...]
  ...chainForCompletion.map(t => apply deltaDays) // ✅ [g3-1 (shifted), ...]
];

onCascade(cascadedTasks);
// ✅ draggedChild сохраняется
// ✅ g2 (parent) сохраняется с новыми датами
// ✅ g3-1 (successor of g2-5) сохраняется
// ✅ g4 (successor of g2) сохраняется
```

### Таблица: Что работает vs что не работает (ДО фикса)

| Этап | draggedChild (g2-5) | parent (g2) | successors (g3-1, g4) | successors of parent |
|------|-------------------|-------------|----------------------|---------------------|
| **MouseDown** | ✅ В globalActiveDrag | ✅ В hierarchyChain | ✅ В cascadeChain | ❌ Не в цепи |
| **DragProgress** | ✅ В overrides | ✅ В overrides (via parent sync) | ✅ В overrides | ❌ Не обрабатываются |
| **UI (Preview)** | ✅ Визуально двигается | ✅ Расширяется | ✅ Сдвигаются | ❌ Не видно |
| **handleComplete (ДО)** | ✅ В cascadedTasks | ❌ НЕ в cascadedTasks | ✅ В cascadedTasks | ❌ Не обрабатываются |
| **handleComplete (ПОСЛЕ)** | ✅ В cascadedTasks | ✅ В hierarchyCascadeTasks | ✅ В cascadedTasks | ✅ В hierarchyCascadeTasks |

## Eliminated

## Resolution
root_cause: В handleComplete (строки 1327-1339) chainForCompletion вычисляется через getTransitiveCascadeChain(taskId, ...), которая возвращает только successors draggedTask. При child drag родительская задача (g2) НЕ является successor, поэтому НЕ попадает в cascadedTasks. Merge hierarchyChildren (строки 1341-1354) работает только для parent drag, когда у draggedTask есть дети. Для child drag hierarchyChildren = [], поэтому родитель не добавляется. Дополнительная проблема: cascadedTasks использует deltaDays для ПЕРЕВЫЧИСЛЕНИЯ дат всех задач, что перезаписывает бы правильно вычисленные даты для родителя.

fix: В handleComplete добавлен массив hierarchyCascadeTasks для хранения родителя и его последователей с ПРЕДВЫЧИСЛЕННЫМИ датами:
1. При child drag (есть parentId) вычисляются новые даты родителя с учётом позиции draggedChild
2. Вычисляется parentDeltaDays (сдвиг родителя)
3. Добавляется родитель в hierarchyCascadeTasks с новыми датами
4. Вычисляются successors родителя через getTransitiveCascadeChain
5. Применяется parentDeltaDays к successor'ам родителя
6. Добавляются successor'ы родителя в hierarchyCascadeTasks
7. В cascadedTasks hierarchyCascadeTasks добавляется ПЕРЕД chainForCompletion
8. chainForCompletion обрабатывается с deltaDays (как и раньше)
9. Добавлены DEBUG логи для отслеживания cascade hierarchy

Изменения в useTaskDrag.ts:
- Строки 1341-1409: Добавлена логика hierarchyCascadeTasks
- Строки 1413-1439: Обновлён cascadedTasks для включения hierarchyCascadeTasks + DEBUG логи

verification: Ожидает проверки пользователем

files_changed: ["packages/gantt-lib/src/hooks/useTaskDrag.ts"]
