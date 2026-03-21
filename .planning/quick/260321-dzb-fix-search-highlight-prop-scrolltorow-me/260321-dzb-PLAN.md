---
phase: quick
plan: 260321-dzb
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/website/src/app/page.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Пользователь может ввести текст поиска в поле на demo странице"
    - "Найденные задачи подсвечиваются в TaskList (изменяется фон строки)"
    - "При нажатии Enter происходит прокрутка к первой найденной задаче"
    - "Фильтрация задач НЕ происходит — все задачи остаются на месте"
  artifacts:
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "highlightedTaskIds prop и scrollToRow method"
      exports: ["GanttChartProps.highlightedTaskIds", "GanttChartHandle.scrollToRow"]
    - path: "packages/website/src/app/page.tsx"
      provides: "Поисковое поле и обработчик поиска"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "Компонент без встроенного поиска (использует проп highlightedTaskIds)"
  key_links:
    - from: "packages/website/src/app/page.tsx"
      to: "GanttChart highlightedTaskIds"
      via: "Set<string> с ID найденных задач"
      pattern: "highlightedTaskIds.*new Set"
    - from: "packages/website/src/app/page.tsx"
      to: "GanttChartHandle.scrollToRow"
      via: "ref.current?.scrollToRow(taskId)"
      pattern: "scrollToRow.*onEnter"
---

<objective>
Исправить реализацию поиска: убрать встроенный поиск из TaskList, добавить highlightedTaskIds проп в GanttChart, реализовать scrollToRow метод, добавить пример поиска на demo странице.

Предыдущий quick task (260321-dsr) сделал неправильно — добавил поле поиска ВНУТРЬ TaskList и сделал фильтрацию задач. Это нарушает синхронизацию с grid.

Правильный подход:
1. Поиск живёт на demo странице (в пользовательском коде)
2. Demo страница передаёт highlightedTaskIds в GanttChart
3. GanttChart пробрасывает highlightedTaskIds в TaskList
4. TaskList использует highlightedTaskIds только для подсветки (не фильтрации!)
5. scrollToRow() метод прокручивает TaskList к нужной задаче

Purpose: Корректная реализация функции поиска без нарушения синхронизации grid и tasklist
Output: Рабочий поиск с подсветкой и прокруткой, без фильтрации задач
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

## Текущее состояние (после неправильного 260321-dsr)

**TaskList.tsx (строки 305-337):**
- Добавлен searchQuery state
- Добавлена фильтрация через searchFilteredTasks
- Поле поиска встроено в header TaskList
- Нарушена синхронизация с grid (разное количество задач)

**GanttChart.tsx:**
- НЕТ highlightedTaskIds в GanttChartProps
- НЕТ scrollToRow в GanttChartHandle
- TaskList получает matchedTaskIds (от taskFilter), а не highlightedTaskIds

## Что нужно сделать

### 1. Откатить изменения в TaskList.tsx
- Удалить searchQuery state (строка 306)
- Удалить searchFilteredTasks (строки 309-315)
- Удалить searchTotalHeight (строки 318-321)
- Удалить searchVisibleTaskNumberMap (строки 324-330)
- Удалить handleSearchKeyDown (строки 333-337)
- Удалить поле поиска из header (строки 850-857)
- Заменить searchFilteredTasks на visibleTasks
- Заменить searchTotalHeight на totalHeight
- Заменить searchVisibleTaskNumberMap на visibleTaskNumberMap

### 2. Добавить highlightedTaskIds в GanttChartProps
```typescript
export interface GanttChartProps {
  // ... существующие пропсы
  /** Task IDs to highlight in the task list (for search results) */
  highlightedTaskIds?: Set<string>;
}
```

### 3. Добавить scrollToRow в GanttChartHandle
```typescript
export interface GanttChartHandle {
  scrollToToday: () => void;
  scrollToTask: (taskId: string) => void;
  scrollToRow: (taskId: string) => void;  // NEW
  collapseAll: () => void;
  expandAll: () => void;
}
```

### 4. Пробросить highlightedTaskIds в TaskList
```typescript
<TaskList
  // ...
  highlightedTaskIds={highlightedTaskIds ?? matchedTaskIds}
/>
```

### 5. Реализовать scrollToRow в GanttChart
- Создать ref для TaskList (или использовать callback ref)
- Реализовать scrollToRow(taskId): найти индекс задачи в visibleTasks, прокрутить body div

### 6. Добавить пример поиска на demo странице
- Добавить state для searchQuery
- Добавить input поле для поиска
- Вычислять highlightedTaskIds на основе searchQuery
- Добавить обработчик Enter для вызова scrollToRow
</context>

<tasks>

<task type="auto">
  <name>Task 1: Откатить встроенный поиск в TaskList и добавить highlightedTaskIds в GanttChart</name>
  <files>
    packages/gantt-lib/src/components/TaskList/TaskList.tsx
    packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  </files>
  <action>
    **1. TaskList.tsx — убрать встроенный поиск:**

    Удалить:
    - Строки 305-337 (search state, filtered tasks, handler)
    - Строки 850-857 (поле поиска в header)

    Заменить:
    - `searchFilteredTasks` → `visibleTasks` (строки 520, 554, 789, 898, 960, 964, 977)
    - `searchTotalHeight` → `totalHeight` (строка 897)
    - `searchVisibleTaskNumberMap` → `visibleTaskNumberMap` (строка 904)

    **2. GanttChart.tsx — добавить highlightedTaskIds проп:**

    В GanttChartProps (после строки 145):
    ```typescript
    /** Task IDs to highlight in the task list (for search results) */
    highlightedTaskIds?: Set<string>;
    ```

    В деструктуризации пропсов (после строки 211):
    ```typescript
    highlightedTaskIds: externalHighlightedTaskIds,
    ```

    **3. GanttChart.tsx — добавить scrollToRow в handle:**

    В GanttChartHandle (после строки 153):
    ```typescript
    scrollToRow: (taskId: string) => void;
    ```

    В useImperativeHandle (строка 642):
    ```typescript
    () => ({
      scrollToToday,
      scrollToTask,
      scrollToRow: (taskId: string) => {
        // Будет реализовано в Task 2
        console.log('scrollToRow:', taskId);
      },
      collapseAll: handleCollapseAll,
      expandAll: handleExpandAll,
    }),
    ```

    **4. Пробросить highlightedTaskIds в TaskList:**

    Заменить (строка 857):
    ```typescript
    highlightedTaskIds={matchedTaskIds}
    ```
    На:
    ```typescript
    highlightedTaskIds={externalHighlightedTaskIds ?? matchedTaskIds}
    ```
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npm run build 2>&1 | head -50</automated>
  </verify>
  <done>
    - TaskList не содержит встроенного поиска (нет searchQuery state)
    - GanttChartProps имеет highlightedTaskIds?: Set&lt;string&gt;
    - GanttChartHandle имеет scrollToRow метод
    - TypeScript компилируется без ошибок
  </done>
</task>

<task type="auto">
  <name>Task 2: Реализовать scrollToRow и добавить пример поиска на demo странице</name>
  <files>
    packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    packages/website/src/app/page.tsx
  </files>
  <action>
    **1. GanttChart.tsx — реализовать scrollToRow:**

    Добавить после строки 833 (после компонента TaskList):
    ```typescript
    // Ref для доступа к TaskList
    const taskListRef = useRef<{ scrollToRow: (taskId: string) => void }>(null);
    ```

    В TaskList компонент (строка 833), добавить ref:
    ```typescript
    <TaskList
      ref={taskListRef}
      // ... остальные пропсы
    />
    ```

    В useImperativeHandle (заменить заглушку scrollToRow):
    ```typescript
    scrollToRow: (taskId: string) => {
      taskListRef.current?.scrollToRow(taskId);
    },
    ```

    **2. TaskList.tsx — добавить scrollToRow метод и expose через useImperativeHandle:**

    Добавить импорт (если нет):
    ```typescript
    import { useImperativeHandle, forwardRef } from 'react';
    ```

    Создать export interface TaskListHandle:
    ```typescript
    export interface TaskListHandle {
      scrollToRow: (taskId: string) => void;
    }
    ```

    Изменить объявление компонента:
    ```typescript
    export const TaskList = forwardRef<TaskListHandle, TaskListProps>(({ ... }, ref) => {
    ```

    Добавить ref для body div:
    ```typescript
    const bodyRef = useRef<HTMLDivElement>(null);
    ```

    В return, добавить ref к body div (строка ~897):
    ```typescript
    <div className="gantt-tl-body" ref={bodyRef} style={{ height: `${totalHeight}px` }}>
    ```

    Добавить useImperativeHandle перед return:
    ```typescript
    useImperativeHandle(ref, () => ({
      scrollToRow: (taskId: string) => {
        const index = visibleTasks.findIndex(t => t.id === taskId);
        if (index === -1 || !bodyRef.current) return;
        const scrollTop = index * rowHeight;
        bodyRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
      },
    }), [visibleTasks, rowHeight]);
    ```

    Добавить displayName в конце файла:
    ```typescript
    TaskList.displayName = 'TaskList';
    ```

    **3. page.tsx — добавить пример поиска:**

    После строки 825 (после taskFilter state):
    ```typescript
    const [searchQuery, setSearchQuery] = useState('');
    ```

    Вычислить highlightedTaskIds (после searchQuery):
    ```typescript
    const highlightedTaskIds = useMemo(() => {
      if (!searchQuery.trim()) return new Set<string>();
      const query = searchQuery.toLowerCase();
      return new Set(tasks.filter(t => t.name.toLowerCase().includes(query)).map(t => t.id));
    }, [searchQuery, tasks]);
    ```

    Добавить обработчик Enter:
    ```typescript
    const handleSearchEnter = useCallback(() => {
      if (!searchQuery.trim()) return;
      const matched = tasks.find(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
      if (matched) {
        ganttChartRef.current?.scrollToRow(matched.id);
      }
    }, [searchQuery, tasks]);
    ```

    В "Main Demo" controls (после строки 1158, после кнопки "Рабочие дни"):
    ```typescript
    <input
      type="text"
      placeholder="Поиск задач..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') handleSearchEnter(); }}
      style={{
        padding: '6px 12px',
        fontSize: '0.875rem',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        minWidth: '200px',
      }}
    />
    ```

    В GanttChart компонент (строка 1338), добавить проп:
    ```typescript
    highlightedTaskIds={highlightedTaskIds}
    ```
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npm run build 2>&1 | head -50</automated>
  </verify>
  <done>
    - scrollToRow прокручивает TaskList к задаче
    - На demo странице есть поле поиска
    - При вводе текста задачи подсвечиваются в TaskList
    - При нажатии Enter происходит прокрутка к первой найденной задаче
    - Фильтрация НЕ происходит — все задачи остаются на месте
  </done>
</task>

</tasks>

<verification>
1. Проверить что поле поиска работает (ввод текста подсвечивает задачи)
2. Проверить что Enter прокручивает к первой найденной задаче
3. Проверить что все задачи остаются на месте (нет фильтрации)
4. Проверить что синхронизация grid и tasklist не нарушена
</verification>

<success_criteria>
- Поле поиска на demo странице принимает ввод
- Найденные задачи подсвечены в TaskList (фон строки изменён)
- Enter прокручивает TaskList к первой найденной задаче
- Количество задач в grid и tasklist совпадает
- TypeScript компилируется без ошибок
</success_criteria>

<output>
After completion, create `.planning/quick/260321-dzb-fix-search-highlight-prop-scrolltorow-me/260321-dzb-SUMMARY.md`
</output>
