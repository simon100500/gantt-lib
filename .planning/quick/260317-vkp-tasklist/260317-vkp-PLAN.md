---
phase: quick-260317-vkp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: [VKP-01]
must_haves:
  truths:
    - "Кнопка вставки задачи (плюс) — синяя"
    - "Кнопка удаления задачи (корзина) — красная (без изменений)"
    - "Кнопка иерархии (стрелка promote/demote) — тёмно-серая"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Обновлённые цвета кнопок действий"
      contains: "gantt-tl-action-insert"
  key_links: []
---

<objective>
Изменить цвета кнопок действий в TaskList: вставка задачи — синяя (была зелёная), удаление — красная (без изменений), иерархия — тёмно-серая (была синяя).

Purpose: Визуальное разделение действий по цвету — синий для создания, красный для удаления, нейтральный серый для иерархии.
Output: Обновлённый TaskList.css с новыми цветами кнопок.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/gantt-lib/src/components/TaskList/TaskList.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Изменить цвета кнопок действий в TaskList.css</name>
  <files>packages/gantt-lib/src/components/TaskList/TaskList.css</files>
  <action>
В файле TaskList.css изменить цвета трёх групп кнопок:

1. **Кнопка вставки (`.gantt-tl-action-insert`)** — сменить с зелёной на синюю:
   - `background-color: #22c55e` → `background-color: #3b82f6` (строка ~526)
   - hover: `background-color: #16a34a` → `background-color: #2563eb` (строка ~531)

2. **Кнопка удаления (`.gantt-tl-action-delete`)** — оставить без изменений (красная #ef4444).

3. **Кнопка иерархии (`.gantt-tl-action-hierarchy`)** — сменить с синей на тёмно-серую:
   - `background-color: #3b82f6` → `background-color: #4b5563` (gray-600) (строка ~564)
   - hover: `background-color: #2563eb` → `background-color: #374151` (gray-700) (строка ~569)
  </action>
  <verify>
    <automated>cd /d/Projects/gantt-lib && grep -A2 "gantt-tl-action-insert {" packages/gantt-lib/src/components/TaskList/TaskList.css | grep "#3b82f6" && grep -A2 "gantt-tl-action-hierarchy {" packages/gantt-lib/src/components/TaskList/TaskList.css | grep "#4b5563" && echo "PASS"</automated>
  </verify>
  <done>Кнопка вставки — синяя (#3b82f6), кнопка удаления — красная (#ef4444, без изменений), кнопка иерархии — тёмно-серая (#4b5563)</done>
</task>

</tasks>

<verification>
- grep подтверждает новые цвета в CSS
- Визуально: при наведении на строку задачи кнопки отображаются в корректных цветах
</verification>

<success_criteria>
Все три типа кнопок действий имеют правильные цвета: синий (вставка), красный (удаление), тёмно-серый (иерархия).
</success_criteria>

<output>
After completion, create `.planning/quick/260317-vkp-tasklist/260317-vkp-SUMMARY.md`
</output>
