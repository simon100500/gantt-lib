---
phase: quick-feature-search-row-highlight-scroll
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "Пользователь может ввести текст поиска в TaskList"
    - "При вводе подсвечиваются совпадающие задачи"
    - "При нажатии Enter происходит прокрутка к первому совпадению"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "Search input state and filter logic"
      exports: ["searchQuery", "filteredTasks"]
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Highlight style for matched tasks"
  key_links:
    - from: "TaskList.tsx search input"
      to: "visibleTasks filter"
      via: "task.name.includes(searchQuery)"
      pattern: "task.name.toLowerCase().includes"
    - from: "Search input Enter key"
      to: "onScrollToTask callback"
      via: "first matched task ID"
      pattern: "onScrollToTask.*firstMatch"
---

<objective>
Добавить поле поиска в TaskList для фильтрации задач по названию с подсветкой и прокруткой к первой найденной задаче.

Purpose: Улучшение UX для быстрой навигации по списку задач в больших проектах
Output: Рабочее поле поиска в заголовке TaskList с фильтрацией и прокруткой
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/src/components/TaskList/TaskList.tsx
@packages/gantt-lib/src/components/ui/Input.tsx
@packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Добавить поле поиска в TaskList</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx, packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
1. В TaskList.tsx добавить состояние для поискового запроса:
   ```typescript
   const [searchQuery, setSearchQuery] = useState('');
   ```

2. Добавить вычисляемый список отфильтрованных задач:
   ```typescript
   const searchFilteredTasks = useMemo(() => {
     if (!searchQuery.trim()) return visibleTasks;
     const query = searchQuery.toLowerCase();
     return visibleTasks.filter(task =>
       task.name.toLowerCase().includes(query)
     );
   }, [visibleTasks, searchQuery]);
   ```

3. Заменить visibleTasks на searchFilteredTasks при рендеринге строк

4. Добавить обработчик Enter для прокрутки к первому совпадению:
   ```typescript
   const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
     if (e.key === 'Enter' && searchFilteredTasks.length > 0) {
       onScrollToTask?.(searchFilteredTasks[0].id);
     }
   }, [searchFilteredTasks, onScrollToTask]);
   ```

5. В заголовок TaskList добавить Input компонент:
   ```tsx
   <Input
     type="text"
     placeholder="Поиск задач..."
     value={searchQuery}
     onChange={(e) => setSearchQuery(e.target.value)}
     onKeyDown={handleSearchKeyDown}
     className="gantt-tl-search-input"
   />
   ```

6. В TaskList.css добавить стили для поискового инпута:
   ```css
   .gantt-tl-search-input {
     width: 100%;
     min-width: 140px;
     padding: 4px 8px;
     font-size: 12px;
     border: 1px solid var(--gantt-border);
     border-radius: 4px;
   }
   ```

7. Обновить заголовок TaskList, добавив ячейку для поиска перед колонкой "Имя" или вместо неё

НЕ ДОБАВЛЯТЬ новые пропсы в GanttChart - это внутренняя функциональность TaskList
  </action>
  <verify>
    <automated>npm run build --workspace=packages/gantt-lib</automated>
  </verify>
  <done>Поле поиска появляется в TaskList, ввод текста фильтрует задачи, Enter прокручивает к первому совпадению</done>
</task>

</tasks>

<verification>
- Поле поиска рендерится в заголовке TaskList
- Ввод текста фильтрует список задач в реальном времени
- Нажатие Enter прокручивает диаграмму к первой найденной задаче
- Очистка поля поиска возвращает полный список задач
- Сборка проходит без ошибок
</verification>

<success_criteria>
- Поиск работает по названию задач (case-insensitive)
- Подсветка найденных задач (они остаются видимыми, остальные скрываются)
- Прокрутка к первому совпадению по Enter
- Не ломает существующую функциональность TaskList
</success_criteria>

<output>
After completion, create `.planning/quick/260321-dsr-feature-search-row-highlight-scroll/260321-dsr-SUMMARY.md`
</output>
