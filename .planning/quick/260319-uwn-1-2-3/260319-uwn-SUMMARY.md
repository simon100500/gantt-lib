---
phase: quick
plan: 260319-uwn
subsystem: TaskList
tags: [hierarchy, task-insertion, ui]
dependency_graph:
  requires:
    - "@packages/gantt-lib/src/utils/dependencyUtils.ts"
  provides:
    - "packages/website/src/app/page.tsx: handleInsertAfter с иерархической логикой"
  affects:
    - "TaskList insert buttons (+)"
tech_stack:
  added:
    - "getAllDescendants utility в dependencyUtils.ts"
  patterns:
    - "Транзитивное замыкание детей для поиска позиции вставки"
key_files:
  created: []
  modified:
    - "packages/gantt-lib/src/utils/dependencyUtils.ts (добавлен getAllDescendants)"
    - "packages/website/src/app/page.tsx (обновлён handleInsertAfter)"
decisions: []
metrics:
  duration: "PT5M"
  completed_date: "2026-03-19"
---

# Phase quick Plan 260319-uwn: Иерархическое добавление задач Summary

**One-liner:** Добавление задач с учётом иерархии: родительская кнопка → после детей, кнопка ребёнка → тот же родитель

## Что сделано

### Task 1: Обновить handleInsertAfter для работы с иерархией

**Файлы изменены:**
- `packages/gantt-lib/src/utils/dependencyUtils.ts` — добавлена функция `getAllDescendants`
- `packages/website/src/app/page.tsx` — обновлён `handleInsertAfter`

**Реализация:**

1. **Добавлен getAllDescendants в dependencyUtils.ts**
   - Рекурсивно собирает всех потомков задачи (транзитивное замыкание)
   - Использует getChildren для прямых детей
   - Защита от циклов через Set visited

2. **Обновлён handleInsertAfter в page.tsx**
   - **Родительская задача**: найти последнего потомка через `getAllDescendants`, вставить после него (корневая задача)
   - **Дочерняя задача**: вставить с тем же `parentId` после текущей задачи
   - Импортирует `isTaskParent` и `getAllDescendants` из `dependencyUtils`

**Логика вставки:**
```typescript
// Если задача — родитель (есть дети)
if (isTaskParent(taskId, prev)) {
  const descendants = getAllDescendants(taskId, prev);
  // Найти индекс последнего потомка
  const lastIndex = descendants.length > 0
    ? prev.findIndex(t => t.id === descendants[descendants.length - 1].id)
    : prev.findIndex(t => t.id === taskId);
  // Вставить после последнего потомка (как корневую задачу)
  newTasks.splice(lastIndex + 1, 0, { ...newTask, parentId: undefined });
}

// Если задача — ребёнок
else {
  // Вставить с тем же parentId после текущей задачи
  newTasks.splice(index + 1, 0, { ...newTask, parentId: task.parentId });
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Добавлена недостающая утилита getAllDescendants**
- **Found during:** Task 1
- **Issue:** План указывал использовать `getAllDescendants` из `dependencyUtils.ts`, но функция там отсутствовала
- **Fix:** Добавлена функция `getAllDescendants` в `dependencyUtils.ts` (реализация скопирована из локальной версии в `TaskList.tsx`)
- **Files modified:** `packages/gantt-lib/src/utils/dependencyUtils.ts`
- **Commit:** `2c929f4`

### Auth Gates

Нет — задание не требовало аутентификации

## Verification

**План проверки:**
1. Создать родительскую задачу с детьми
2. Нажать '+' на родительской задаче → новая задача появляется после всех детей (как корневая)
3. Нажать '+' на дочерней задаче → новая задача становится ребёнком того же родителя
4. Нажать '+ Добавить задачу' внизу → создаётся корневая задача (уже работало через `handleAdd`)

**Результат:**
- ✅ Библиотека собралась без ошибок
- ✅ Dev сервер запустился успешно
- ✅ Нет ошибок компиляции TypeScript

**Ручная проверка required:** Пользователь должен проверить визуально на http://localhost:3005

## Commits

| Hash | Message |
|------|---------|
| 2c929f4 | feat(260319-uwn): add getAllDescendants utility to dependencyUtils |
| b47226b | feat(260319-uwn): update handleInsertAfter for hierarchical task insertion |

## Self-Check: PASSED

**Проверки:**
- ✅ Файл `packages/gantt-lib/src/utils/dependencyUtils.ts` существует и содержит `getAllDescendants`
- ✅ Файл `packages/website/src/app/page.tsx` содержит обновлённый `handleInsertAfter`
- ✅ Коммиты `2c929f4` и `b47226b` существуют в git
- ✅ Библиотека собралась успешно
- ✅ Dev сервер запустился без ошибок
