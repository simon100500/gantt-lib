---
phase: quick-34
plan: 34
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/types/index.ts
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [QUICK-34]

must_haves:
  truths:
    - "Существует системный пропс disableTaskNameEditing для отключения редактирования названий всех задач"
    - "Если disableTaskNameEditing=true, название задачи в task list нельзя редактировать (нет поля ввода при клике)"
    - "Если у задачи locked=true, даты в task list нельзя изменить через DatePicker (disabled=true)"
    - "Заблокированные даты показываются визуально (опционально: другой стиль или иконка замка)"
  artifacts:
    - path: "packages/gantt-lib/src/types/index.ts"
      provides: "Добавлено поле disableTaskNameEditing?: boolean в GanttChartProps"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "Пропс disableTaskNameEditing передаётся в TaskListRow"
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Логика: имя не редактируется если disableTaskNameEditing=true, даты не редактируются если task.locked=true"
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "Пропс disableTaskNameEditing пробрасывается в TaskList"
  key_links:
    - from: "GanttChartProps.disableTaskNameEditing"
      to: "TaskListProps.disableTaskNameEditing"
      via: "prop passing"
      pattern: "disableTaskNameEditing.*\\{"
    - from: "TaskListRow.tsx handleNameClick"
      to: "editingName state"
      via: "guard clause"
      pattern: "if.*disableTaskNameEditing.*return"
    - from: "TaskListRow.tsx DatePicker"
      to: "disabled prop"
      via: "task.locked check"
      pattern: "disabled=\\{task\\.locked\\}"
---

<objective>
Добавить свойство для отключения редактирования названий задач на всём графике и заблокировать
редактирование дат через task list для задач со свойством locked=true.

Purpose: Системный контроль редактирования — некоторые сценарии требуют запретить изменение
названий всех задач (например, режим "только чтение" или синхронизация с внешней системой),
а заблокированные задачи (locked=true) не должны быть доступны для редактирования через task list.
Output: Новый пропс disableTaskNameEditing в GanttChart + логика блокировки дат для locked задач.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/src/types/index.ts
@packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
@packages/gantt-lib/src/components/TaskList/TaskList.tsx
@packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
@packages/gantt-lib/src/components/TaskList/TaskList.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Добавить пропс disableTaskNameEditing в типы и компоненты</name>
  <files>packages/gantt-lib/src/types/index.ts</files>
  <action>
В файле `packages/gantt-lib/src/types/index.ts`:

Найти интерфейс `GanttChartProps` и добавить новый опциональный пропс:

```typescript
export interface GanttChartProps {
  // ... существующие пропсы ...
  /** Disable task name editing in the task list (default: false) */
  disableTaskNameEditing?: boolean;
}
```

Этот пропс будет контролировать, можно ли редактировать названия задач через task list.
Если true — при клике на название не появится поле ввода.
  </action>
  <verify>
grep -n "disableTaskNameEditing" packages/gantt-lib/src/types/index.ts
  </verify>
  <done>
В GanttChartProps добавлено поле disableTaskNameEditing?: boolean с JSDoc комментарием.
  </done>
</task>

<task type="auto">
  <name>Task 2: Пробросить disableTaskNameEditing через GanttChart в TaskList</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</files>
  <action>
В файле `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`:

1. Деструктурировать новый пропс из props (рядом с showTaskList):
```typescript
export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  dayWidth = 40,
  rowHeight = 40,
  headerHeight = 40,
  containerHeight = 600,
  onChange,
  onValidateDependencies,
  enableAutoSchedule,
  disableConstraints,
  onCascade,
  showTaskList = false,
  taskListWidth = 520,
  disableTaskNameEditing = false, // <-- добавить
}) => {
```

2. Передать пропс в компонент TaskList (найти место где рендерится TaskList):
```tsx
<TaskList
  tasks={tasks}
  rowHeight={rowHeight}
  headerHeight={headerHeight}
  taskListWidth={taskListWidth}
  onTaskChange={handleTaskChange}
  selectedTaskId={selectedTaskId ?? undefined}
  onTaskSelect={handleTaskSelect}
  show={showTaskList}
  disableTaskNameEditing={disableTaskNameEditing} // <-- добавить
/>
```
  </action>
  <verify>
grep -n "disableTaskNameEditing" packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
  </verify>
  <done>
GanttChart принимает disableTaskNameEditing из props и передаёт в TaskList.
  </done>
</task>

<task type="auto">
  <name>Task 3: Обновить TaskList для передачи disableTaskNameEditing и task.locked в TaskListRow</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.tsx</files>
  <action>
В файле `packages/gantt-lib/src/components/TaskList/TaskList.tsx`:

1. Добавить пропс в интерфейс TaskListProps:
```typescript
export interface TaskListProps {
  // ... существующие пропсы ...
  /** Disable task name editing in the task list (default: false) */
  disableTaskNameEditing?: boolean;
}
```

2. Принять пропс в компоненте:
```typescript
export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  rowHeight,
  headerHeight,
  taskListWidth = 520,
  onTaskChange,
  selectedTaskId,
  onTaskSelect,
  show = true,
  disableTaskNameEditing = false, // <-- добавить
}) => {
```

3. Передать пропс в TaskListRow (в месте map):
```tsx
{tasks.map((task, index) => (
  <TaskListRow
    key={task.id}
    task={task}
    rowIndex={index}
    rowHeight={rowHeight}
    onTaskChange={onTaskChange}
    selectedTaskId={selectedTaskId}
    onRowClick={handleRowClick}
    disableTaskNameEditing={disableTaskNameEditing} // <-- добавить
  />
))}
```
  </action>
  <verify>
grep -n "disableTaskNameEditing" packages/gantt-lib/src/components/TaskList/TaskList.tsx
  </verify>
  <done>
TaskList принимает disableTaskNameEditing и передаёт в каждый TaskListRow.
  </done>
</task>

<task type="auto">
  <name>Task 4: Реализовать логику блокировки в TaskListRow (имя + даты)</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
В файле `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx`:

1. Добавить пропс в интерфейс TaskListRowProps:
```typescript
export interface TaskListRowProps {
  // ... существующие пропсы ...
  /** Disable task name editing (default: false) */
  disableTaskNameEditing?: boolean;
}
```

2. Принять пропс в компоненте:
```typescript
export const TaskListRow: React.FC<TaskListRowProps> = React.memo(
  ({ task, rowIndex, rowHeight, onTaskChange, selectedTaskId, onRowClick, disableTaskNameEditing = false }) => {
```

3. Добавить guard clause в handleNameClick — если редактирование отключено, не открывать input:
```typescript
const handleNameClick = useCallback((e: React.MouseEvent) => {
  if (disableTaskNameEditing) return; // <-- добавить
  e.stopPropagation();
  setNameValue(task.name);
  setEditingName(true);
}, [task.name, disableTaskNameEditing]); // <-- добавить в зависимости
```

4. Добавить cursor стилизацию для заблокированного имени (если disableTaskNameEditing=true):
В className для кнопки gantt-tl-name-trigger добавить условие:
```tsx
<button
  type="button"
  className={`gantt-tl-name-trigger ${disableTaskNameEditing ? 'gantt-tl-name-locked' : ''}`}
  onClick={handleNameClick}
  style={editingName ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
>
  {task.name}
</button>
```

5. Заблокировать DatePicker если задача locked:
```tsx
{/* Start Date — DatePicker component */}
<div className="gantt-tl-cell gantt-tl-cell-date" onClick={(e) => e.stopPropagation()}>
  <DatePicker
    value={startDateISO}
    onChange={handleStartDateChange}
    format="dd.MM.yy"
    portal={true}
    disabled={task.locked}  // <-- добавить
  />
</div>

{/* End Date — DatePicker component */}
<div className="gantt-tl-cell gantt-tl-cell-date" onClick={(e) => e.stopPropagation()}>
  <DatePicker
    value={endDateISO}
    onChange={handleEndDateChange}
    format="dd.MM.yy"
    portal={true}
    disabled={task.locked}  // <-- добавить
  />
</div>
```

6. Обновить arePropsEqual в TaskListRow (если есть React.memo) — добавить disableTaskNameEditing в сравнение.
Но TaskListRow уже использует React.memo — нужно проверить, есть ли кастомная функция сравнения.
Если нет — добавить для предотвращения лишних ре-рендеров.
  </action>
  <verify>
grep -n "disableTaskNameEditing\|disabled={task.locked}" packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
  </verify>
  <done>
handleNameClick содержит guard clause для disableTaskNameEditing.
DatePicker имеет disabled={task.locked} для обеих дат.
gantt-tl-name-locked класс добавлен когда disableTaskNameEditing=true.
  </done>
</task>

<task type="auto">
  <name>Task 5: Добавить стили для заблокированного названия задачи</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
В файле `packages/gantt-lib/src/components/TaskList/TaskList.css`:

Добавить стили для заблокированного названия (курсор по умолчанию, не pointer):

```css
/* Заблокированное название задачи — курсор по умолчанию */
.gantt-tl-name-locked {
  cursor: default !important;
}
```

Это визуально покажет пользователю, что название нельзя редактировать.
  </action>
  <verify>
grep -n "gantt-tl-name-locked" packages/gantt-lib/src/components/TaskList/TaskList.css
  </verify>
  <done>
CSS класс gantt-tl-name-locked добавлен с cursor: default.
  </done>
</task>

</tasks>

<verification>
1. `npm run build --workspace=packages/gantt-lib` — сборка без ошибок TypeScript
2. Визуальная проверка в браузере:
   - При disableTaskNameEditing=true клик по названию не открывает поле ввода
   - При task.locked=true даты в task list показывают заблокированный DatePicker (не кликабельный)
   - Заблокированные даты имеют визуальный стиль disabled (серый цвет, курсор not-allowed)
   - Обычные задачи (без locked) редактируются как раньше
</verification>

<success_criteria>
- Пропс disableTaskNameEditing добавлен в GanttChartProps и проброшен до TaskListRow
- При disableTaskNameEditing=true название задачи не редактируется (нет input при клике)
- При task.locked=true DatePicker для дат имеет disabled=true (не открывается)
- CSS класс gantt-tl-name-locked добавлен для визуального индикатора
</success_criteria>

<output>
После завершения создать `.planning/quick/34-/34-SUMMARY.md`
</output>
