---
phase: quick
plan: 260319-uwn
type: execute
wave: 1
depends_on: []
files_modified: [packages/website/src/app/page.tsx]
autonomous: true
requirements: []
must_haves:
  truths:
    - "При клике на '+' родительской задачи новая задача вставляется после всех детей родителя"
    - "При клике на '+' дочерней задачи новая задача становится ребёнком того же родителя"
    - "При клике на '+ Добавить задачу' внизу списка создаётся корневая задача"
  artifacts:
    - path: "packages/website/src/app/page.tsx"
      provides: "Обновлённый handleInsertAfter с иерархической логикой"
  key_links:
    - from: "handleInsertAfter"
      to: "setTasks"
      via: "Вставка задачи с правильным parentId и позицией"
      pattern: "handleInsertAfter.*setTasks"
---

<objective>
Исправить поведение кнопок добавления задач для работы с иерархией

Purpose: Текущая логика вставляет задачи просто после текущей позиции в массиве, без учёта иерархии. Нужно сделать умную вставку: родительская кнопка → после всех детей, кнопка на ребёнке → внутрь родителя, верхний уровень → корневая задача.
Output: Обновлённая функция handleInsertAfter в packages/website/src/app/page.tsx
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/website/src/app/page.tsx
@packages/gantt-lib/src/utils/dependencyUtils.ts (isTaskParent, getChildren, getAllDescendants)
@packages/gantt-lib/src/components/TaskList/TaskListRow.tsx (кнопка вставки, строки 1329-1365)
@packages/gantt-lib/src/components/TaskList/TaskList.tsx (кнопка добавления внизу, строки 874-899)

<interfaces>
From packages/gantt-lib/src/utils/dependencyUtils.ts:
```typescript
export function isTaskParent(taskId: string, tasks: Task[]): boolean;
export function getChildren(parentId: string, tasks: Task[]): Task[];
export function getAllDescendants(parentId: string, tasks: Task[]): Task[];
```

Current handleInsertAfter (packages/website/src/app/page.tsx:804-813):
```typescript
const handleInsertAfter = useCallback((taskId: string, newTask: Task) => {
  setTasks(prev => {
    const index = prev.findIndex(t => t.id === taskId);
    if (index === -1) return prev;
    // Insert after the found index
    const newTasks = [...prev];
    newTasks.splice(index + 1, 0, newTask);
    return newTasks;
  });
}, []);
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Обновить handleInsertAfter для работы с иерархией</name>
  <files>packages/website/src/app/page.tsx</files>
  <action>
    Заменить функцию handleInsertAfter (строки 804-813) на новую логику:

    1. Если taskId === null (кнопка внизу списка) → создать корневую задачу (parentId undefined), вставить в конец массива
    2. Если задача-родитель (isTaskParent === true) → найти последнего потомка в иерархии (getAllDescendants), вставить после него
    3. Если задача-ребёнок (есть parentId) → создать задачу с тем же parentId, вставить после текущей задачи

    Важно: import isTaskParent, getAllDescendants из @gantt-lib/lib/utils/dependencyUtils

    Код должен:
    - Проверять isTaskParent(taskId, prev) для определения типа задачи
    - Использовать getAllDescendants для родительских задач
    - Устанавливать correct parentId для новой задачи
    - Вставлять задачу в правильную позицию массива (после последнего ребёнка для родителя, после текущей для ребёнка)
  </action>
  <verify>
    <automated>cd packages/website && npm run dev</automated>
  </verify>
  <done>
    - Кнопка '+' на родительской задаче вставляет новую задачу после всех детей
    - Кнопка '+' на дочерней задаче вставляет новую задачу с тем же parentId
    - Кнопка '+ Добавить задачу' внизу списка создаёт корневую задачу
  </done>
</task>

</tasks>

<verification>
Проверить визуально:
1. Создать родительскую задачу с детьми
2. Нажать '+' на родительской задаче → новая задача появляется после всех детей
3. Нажать '+' на дочерней задаче → новая задача становится ребёнком того же родителя
4. Нажать '+ Добавить задачу' внизу → создаётся корневая задача
</verification>

<success_criteria>
- Все три сценария добавления задач работают корректно
- Иерархия сохраняется при добавлении задач
- Задачи вставляются в правильные позиции
</success_criteria>

<output>
After completion, create `.planning/quick/260319-uwn-1-2-3/260319-uwn-SUMMARY.md`
</output>
