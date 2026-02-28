---
phase: quick-31
plan: 31
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.css
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
autonomous: true
requirements: [QUICK-31]

must_haves:
  truths:
    - "Название задачи в ячейке занимает меньше вертикального пространства (меньше отступы)"
    - "При клике на название появляется поле ввода шире самой колонки (выходит вправо за пределы)"
    - "Внутри активного поля ввода клик мышью ставит курсор в нужную позицию без переселекта"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Уменьшенные padding-top/bottom в .gantt-tl-cell-name, ширина input через min-width"
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "useEffect только с focus() без select(); select() вызывается только при первом открытии"
  key_links:
    - from: "TaskListRow.tsx useEffect"
      to: "nameInputRef.current"
      via: "focus() without select()"
      pattern: "nameInputRef\\.current\\.focus"
---

<objective>
Улучшить поле ввода названия задачи в task list по трём параметрам: уменьшить вертикальный
отступ в ячейке названия, расширить поле ввода за пределы колонки, исправить позиционирование
курсора внутри поля.

Purpose: UX-улучшение — более компактный вид строк и нормальная работа редактора названия.
Output: Изменения в TaskList.css и TaskListRow.tsx.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Уменьшить отступы в ячейке названия и расширить поле ввода</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
В файле `packages/gantt-lib/src/components/TaskList/TaskList.css`:

1. В классе `.gantt-tl-cell-name` уменьшить вертикальные отступы:
   - Изменить `padding-top: 6px` на `padding-top: 2px`
   - Изменить `padding-bottom: 6px` на `padding-bottom: 2px`
   - Изменить `align-items: flex-start` на `align-items: center`
     (при меньших отступах центрирование выглядит лучше)

2. В классе `.gantt-tl-name-input` расширить поле ввода за пределы колонки:
   - Изменить `min-width: 200px` на `min-width: 320px`
   - Оставить `width: 100%` — поле будет минимум 320px, но не уже колонки
   - Убедиться что `position: absolute` сохранено (уже есть — не трогать)
   - Убедиться что `z-index: 100` сохранено (уже есть — не трогать)

Ячейка `.gantt-tl-cell-name` уже имеет `overflow: visible` — этого достаточно чтобы
input выходил за правую границу. Ничего дополнительного для overflow не нужно.
  </action>
  <verify>Визуально: строки task list стали компактнее, при клике на название появляется поле шире колонки</verify>
  <done>Padding в .gantt-tl-cell-name равен 2px top/bottom, min-width input 320px, align-items center</done>
</task>

<task type="auto">
  <name>Task 2: Исправить позиционирование курсора в поле ввода</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskListRow.tsx</files>
  <action>
В файле `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx`:

Проблема: `useEffect` вызывает `nameInputRef.current.select()` каждый раз при `editingName=true`.
Это сбрасывает позицию курсора при любом клике внутри поля, потому что после первого рендера
`editingName` уже `true`, но `useEffect` снова выполняется при ре-рендерах содержащего компонента.

На самом деле: `useEffect` с `[editingName]` срабатывает только при изменении `editingName`,
значит `select()` вызывается один раз при открытии. Однако проблема в другом — `handleNameClick`
передаёт управление React, и при каждом клике по span (пока поле уже открыто) срабатывает
`onClick` на span → `handleNameClick` → `setNameValue` → ре-рендер, но `editingName` не меняется,
значит useEffect не перезапускается. Реальная причина: span с `onClick={handleNameClick}` находится
ВНУТРИ name cell и остаётся в DOM когда `editingName=true` (input отображается поверх через absolute,
но span всё ещё существует). Клики по span запускают `handleNameClick` снова → `setNameValue` вызывает
`setEditingName(true)` и обновляет `nameValue` → это НЕ меняет `editingName` (он уже true),
но React может не перезапускать useEffect.

Но: в `handleNameClick` вызывается `setEditingName(true)` — если `editingName` уже `true`,
React батчирует изменение без триггера useEffect.

Настоящая проблема: span с `cursor: text` виден поверх input из-за z-index или структуры DOM.
Input имеет `z-index: 100` и `position: absolute`, span — в потоке. Пользователь кликает по span
(поверх которого visually расположен input), но физически span получает клик.

Решение: когда `editingName=true`, скрыть span (или pointer-events: none), чтобы клики проходили
напрямую к input. Добавить условный стиль к span:

```tsx
<span
  className="gantt-tl-cellContent"
  onClick={handleNameClick}
  style={editingName ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
>
  {task.name}
</span>
```

Также убрать `nameInputRef.current.select()` из useEffect — только `focus()`:

```tsx
useEffect(() => {
  if (editingName && nameInputRef.current) {
    nameInputRef.current.focus();
  }
}, [editingName]);
```

Это позволит пользователю кликнуть в нужное место внутри input и поставить курсор туда,
а не сбрасывать его в начало/конец. При первом открытии курсор встанет в место клика
по span (браузер позиционирует его по координатам клика).
  </action>
  <verify>
Открыть task list, кликнуть по названию задачи — появляется поле ввода.
Кликнуть внутри поля в середину текста — курсор должен встать именно там, а не выделить весь текст.
  </verify>
  <done>
Span скрыт (visibility:hidden, pointerEvents:none) когда editingName=true.
useEffect вызывает только focus() без select().
Клик внутри input позиционирует курсор корректно.
  </done>
</task>

</tasks>

<verification>
1. `npm run build --workspace=packages/gantt-lib` — сборка без ошибок TypeScript
2. Визуальная проверка в браузере:
   - Строки task list стали компактнее (меньше вертикальный отступ в ячейке названия)
   - При клике на название появляется поле ввода шириной >= 320px (выходит за пределы колонки)
   - Клик в произвольное место внутри поля ввода ставит курсор туда (не выделяет весь текст)
</verification>

<success_criteria>
- Вертикальный padding в .gantt-tl-cell-name = 2px (было 6px)
- min-width поля ввода = 320px (было 200px)
- Cursor positioning работает: клик внутри input = позиция курсора, не select-all
</success_criteria>

<output>
После завершения создать `.planning/quick/31-task-name-input/31-SUMMARY.md`
</output>
