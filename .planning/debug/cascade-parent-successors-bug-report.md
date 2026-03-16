# Баг Cascade Parent Successors: Полная История и Решение

**Дата:** 2026-03-16
**Статус:** Решение в разработке
**Фаза:** Phase 19 (Hierarchy support)

---

## 📋 Описание Проблемы

При drag ребёнка родительской задачи:
1. **Визуально** работает: родитель расширяется, successor сдвигается
2. **При drop:** всё возвращается на место
3. **При движении назад:** лаг увеличивается вместо сохранения
4. **При drag родителя:** лаги детей схлопываются до 0

### Воспроизведение

1. Открыть демо на http://localhost:3005
2. Взять ребёнка `g2-5` (Уплотнение основания)
3. Сдвинуть вправо на 5 дней
4. Drop
5. **Ожидается:** g2 расширен, g3-1 сдвинут
6. **Фактически:** всё возвращается на исходные позиции

---

## 🔍 Хронология Диагностики

### Попытка 1: draggedChild не в overrides

**Гипотеза:** draggedChild (g2-5) НЕ добавляется в overrides до parent sync

**Fix:** Добавили код (строка 817-819):
```typescript
if (!overrides.has(draggedTaskId)) {
  overrides.set(draggedTaskId, { left: newLeft, width: newWidth });
}
```

**Результат:** ✅ Визуально заработало, но при drop всё равно возвращается

---

### Попытка 2: Родитель не в cascadedTasks

**Гипотеза:** В handleComplete родитель g2 НЕ включается в cascadedTasks для сохранения

**Анализ:**
- `chainForCompletion` = только successors (g3-1)
- g2 отсутствует в `chainForCompletion` (g2 не successor!)
- cascadedTasks = [draggedChild, ...chainForCompletion]
- g2 НЕ сохраняется → возврат на место

**Fix:** Добавили `hierarchyCascadeTasks` (строки 1330-1403):
```typescript
// Вычисляем новые даты родителя
const updatedParent = {
  ...parentTask,
  startDate: parentNewStart.toISOString(),
  endDate: parentNewEnd.toISOString(),
};
hierarchyCascadeTasks.push(updatedParent);

// Добавляем successors родителя
const parentSuccessors = getTransitiveCascadeChain(parentId, allTasks, ['FS', 'SS', 'FF', 'SF']);
```

**Результат:** ❌ Родитель добавляется, но с ИСХОДНЫМИ датами!

---

### Попытка 3: getTransitiveCascadeChain включает детей

**Проблема:** `getTransitiveCascadeChain(parentId, ...)` включает детей родителя (g2-1...g2-5) с их ИСХОДНЫМИ датами, которые перезаписывают правильные даты родителя.

**Логи:**
```
hierarchyCascadeTasks: g2 (...), g2-1 (...), g2-2 (...), g2-3 (...), g2-4 (...), g2-5 (...), g3-1 (...)
```

**Fix:** Добавили фильтрацию детей родителя (строки 1378-1384):
```typescript
const parentChildrenIds = new Set(siblings.map(c => c.id));
for (const parentSuccessor of parentSuccessors) {
  if (parentChildrenIds.has(parentSuccessor.id)) continue;  // Skip siblings
  ...
}
```

**Результат:** ❌ cascadeComplete показывает правильные даты, но при drop всё равно не сохраняется!

---

### Попытка 4: parentDeltaDays = 0

**Проблема:** `parentDeltaDays` вычислялся как `parentNewStart - origParentStart = 0` (startDate не сдвигается), поэтому successors не двигались.

**Логи:**
```
🔧 [PARENT ORIGINAL] g2: 2026-02-16 - 2026-03-01
   ✏️  UPDATING g2-5: 2026-02-27 -> 2026-03-04
   📊 PARENT COMPUTED: 2026-02-16 - 2026-03-06
   ✅ UPDATED PARENT: g2 (2026-02-16 - 2026-03-06)
🎯 [CASCADE COMPLETE]
   hierarchyCascadeTasks: g2 (2026-02-16 - 2026-03-06), g3-1 (2026-03-02 - 2026-03-06)
```

g3-1 НЕ сдвинулся! Должен быть day 35-39, а остаётся day 32-36.

**Fix:** Изменили вычисление parentDeltaDays (строки 1365-1369):
```typescript
const startDelta = Math.round((parentNewStart.getTime() - origParentStart.getTime()) / (24 * 60 * 60 * 1000));
const endDelta = Math.round((parentNewEnd.getTime() - origParentEnd.getTime()) / (24 * 60 * 60 * 1000));
const parentDeltaDays = Math.max(startDelta, endDelta);  // Было: startDelta
```

**Результат:** ✅ Движение вперёд работает! Но...

---

### Попытка 5: Движение назад увеличивает лаг

**Проблема:** `Math.max(startDelta, endDelta)` при движении назад возвращает 0 (startDelta=0, endDelta=-N, max=0).

**Fix:** Изменили на `endDelta`:
```typescript
const parentDeltaDays = endDelta; // FS successors follow parent's END
```

**Результат:** ✅ Движение назад работает! Но...

---

### Попытка 6: Drag родителя схлопывает лаги детей

**Проблема:** При drag родителя все лаги внутри детей становятся 0.

**Анализ:** Этот баг появился из-за хака в попытке 2 - мы добавляли детей родителя в cascade, что нарушало их зависимости.

---

## 💡 КОРНЕВАЯ ПРИЧИНА

**Несистемный подход!** Каждое исправление создавало новый баг:

| Попытка | Исправление | Новый баг |
|---------|------------|-----------|
| 1 | Добавил draggedChild в overrides | Работает только визуально |
| 2 | Добавил hierarchyCascadeTasks | Дети с исходными датами |
| 3 | Отфильтровал детей | parentDeltaDays = 0 |
| 4 | Math.max(start, end) | Движение назад ломает лаг |
| 5 | Использовал endDelta | Drag родителя ломает лаги детей |

**Проблема:** Мы лечили симптомы, а не болезнь. Нужен **универсальный алгоритм** обхода графа зависимостей.

---

## 🎯 УНИВЕРСАЛЬНОЕ РЕШЕНИЕ

### Концепция: Виртуальное дерево зависимостей

Вместо хаков - **один универсальный обход графа**:

```
┌─────────────────────────────────────────────────────────────┐
│                    VIRTUAL DEPENDENCY GRAPH                 │
├─────────────────────────────────────────────────────────────┤
│  NODES: Все задачи                                          │
│  EDGES:                                                      │
│   - dependency: A → B (FS/SS/FF/SF + lag)                   │
│   - hierarchy: parent ↔ children (bidirectional sync)        │
└─────────────────────────────────────────────────────────────┘
```

### Универсальный алгоритм cascade

```typescript
/**
 * УНИВЕРСАЛЬНЫЙ CASCADE ENGINE
 * Обходит всё дерево зависимостей и вычисляет правильные позиции
 */
function universalCascade(
  movedTask: Task,
  newStart: Date,
  newEnd: Date,
  allTasks: Task[]
): Task[] {

  const updated = new Map<string, { start: Date; end: Date }>();
  updated.set(movedTask.id, { start: newStart, end: newEnd });

  const queue: string[] = [movedTask.id];
  const visited = new Set<string>([movedTask.id]);
  const result: Task[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = allTasks.find(t => t.id === currentId)!;
    const { start: currStart, end: currEnd } = updated.get(currentId)!;

    // RULE 1: Hierarchy Children - двигаются с родителем на delta
    for (const child of getChildren(currentId, allTasks)) {
      if (visited.has(child.id)) continue;

      const childOrigStart = new Date(child.startDate);
      const childOrigEnd = new Date(child.endDate);

      // Delta родителя
      const parentOrig = allTasks.find(t => t.id === currentId)!;
      const parentOrigStart = new Date(parentOrig.startDate);
      const parentOrigEnd = new Date(parentOrig.endDate);
      const parentDeltaStart = (currStart.getTime() - parentOrigStart.getTime()) / DAY_MS;
      const parentDeltaEnd = (currEnd.getTime() - parentOrigEnd.getTime()) / DAY_MS;

      // Применяем тот же delta
      const childNewStart = new Date(childOrigStart.getTime() + parentDeltaStart * DAY_MS);
      const childNewEnd = new Date(childOrigEnd.getTime() + parentDeltaEnd * DAY_MS);

      updated.set(child.id, { start: childNewStart, end: childNewEnd });
      visited.add(child.id);
      queue.push(child.id);
      result.push({ ...child, startDate: childNewStart.toISOString(), endDate: childNewEnd.toISOString() });
    }

    // RULE 2: Parent Task - вычисляется от детей
    if ((current as any).parentId) {
      const parentId = (current as any).parentId;
      const parent = allTasks.find(t => t.id === parentId);
      if (parent && !visited.has(parentId)) {
        // Собрать всех детей с их НОВЫМИ позициями
        const siblings = getChildren(parentId, allTasks);
        const childrenWithNewPos = siblings.map(sib => {
          if (sib.id === currentId) {
            return { start: currStart, end: currEnd };
          }
          if (updated.has(sib.id)) {
            return updated.get(sib.id)!;
          }
          return { start: new Date(sib.startDate), end: new Date(sib.endDate) };
        });

        // Parent position = min(children.start) to max(children.end)
        const minStart = new Date(Math.min(...childrenWithNewPos.map(c => c.start.getTime())));
        const maxEnd = new Date(Math.max(...childrenWithNewPos.map(c => c.end.getTime())));

        updated.set(parentId, { start: minStart, end: maxEnd });
        visited.add(parentId);
        queue.push(parentId);
        result.push({ ...parent, startDate: minStart.toISOString(), endDate: maxEnd.toISOString() });
      }
    }

    // RULE 3: Dependency Successors - вычисляются через calculateSuccessorDate
    for (const task of allTasks) {
      if (!task.dependencies || visited.has(task.id)) continue;

      for (const dep of task.dependencies) {
        if (dep.taskId !== currentId) continue;

        const orig = allTasks.find(t => t.id === task.id)!;
        const origStart = new Date(orig.startDate);
        const origEnd = new Date(orig.endDate);
        const duration = origEnd.getTime() - origStart.getTime();

        // constraintDate от НОВОЙ позиции предшественника
        const constraintDate = calculateSuccessorDate(currStart, currEnd, dep.type, dep.lag ?? 0);

        let newStart: Date, newEnd: Date;
        if (dep.type === 'FS' || dep.type === 'SS') {
          newStart = constraintDate;
          newEnd = new Date(constraintDate.getTime() + duration);
        } else {
          newEnd = constraintDate;
          newStart = new Date(constraintDate.getTime() - duration);
        }

        updated.set(task.id, { start: newStart, end: newEnd });
        visited.add(task.id);
        queue.push(task.id);
        result.push({ ...task, startDate: newStart.toISOString(), endDate: newEnd.toISOString() });
        break;
      }
    }
  }

  return result;
}
```

### КЛЮЧЕВЫЕ ПРИНЦИПЫ

1. **BFS обход** - гарантирует правильный порядок применения изменений
2. **Три правила:**
   - Hierarchy children → сдвигаются на delta родителя
   - Parent task → вычисляется от детей
   - Dependency successors → вычисляются через constraint
3. **НЕ изменяет lag!** Lag сохраняется, потому что используем `calculateSuccessorDate` с оригинальным lag
4. **Visited set** - предотвращает циклы и дублирование

---

## 📚 Уроки на Будущее

### ❌ Что НЕ делать

1. **НЕ лечи симптомы** - каждая попытка создавала новый баг
2. **НЕ используй хаки** - `Math.max(start, end)` это костыль
3. **НЕ предполагай порядок** - "родитель сначала, потом successor" - это неправильно
4. **НЕ повторяй логику** - parent sync в 3 местах (preview, completion, hierarchy)

### ✅ Что делать

1. **Структурируй подход** - начни с модели предметной области
2. **Используй графовые алгоритмы** - BFS/DFS для обхода зависимостей
3. **Одна точка истины** - одна функция cascade для всех случаев
4. **Тестируй на граничных случаях** - движение вперёд/назад, resize parent, drag child

### Полезные команды для отладки

```bash
# Сохранить логи в файл
# Открой консоль F12, выполни:
console.log = function() {
  const args = Array.from(arguments);
  const originalLog = console._originalLog || console.log;
  if (!console._originalLog) console._originalLog = originalLog;

  // Вывод в консоль
  originalLog.apply(console, args);

  // Сохранить в массив
  console._logs = console._logs || [];
  console._logs.push(new Date().toISOString() + ' ' + args.join(' '));

  // Скачать как файл
  if (args[0] && args[0].includes('CASCADE COMPLETE')) {
    const blob = new Blob([console._logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drag-log.txt';
    a.click();
  }
}
```

---

## 📁 Связанные файлы

- `packages/gantt-lib/src/hooks/useTaskDrag.ts` - основной drag logic
- `packages/gantt-lib/src/utils/dependencyUtils.ts` - getTransitiveCascadeChain, calculateSuccessorDate
- `.planning/debug/` - логи отладки

---

## 🔄 Статус

- [x] Диагностика завершена
- [ ] Универсальный cascade engine реализован
- [ ] Тесты написаны
- [ ] Все сценарии работают

**Next step:** Реализовать `universalCascade` и заменить всю текущую логику cascade.
