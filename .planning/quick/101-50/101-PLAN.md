---
phase: quick-101
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/website/src/app/page.tsx
autonomous: true
requirements: [QUICK-101]
must_haves:
  truths:
    - "First chart (Construction Project) has exactly 50 tasks"
    - "Tasks are organized into parent groups with children using parentId"
    - "Multiple dependency types are used (FS, SS, FF, SF) with various lags"
    - "Tasks span a realistic construction project timeline"
    - "Some tasks use divider, color, locked, accepted fields for visual variety"
  artifacts:
    - path: "packages/website/src/app/page.tsx"
      provides: "createSampleTasks function with 50 structured tasks"
      contains: "parentId"
---

<objective>
Replace the first chart's createSampleTasks() function with a rich 50-task construction project dataset featuring task hierarchy (parentId), mixed dependency types (FS/SS/FF/SF), lags, varied progress values, colors, and dividers.

Purpose: Show off the library's full feature set in the main demo — hierarchy nesting, all 4 dependency link types, realistic grouping by construction phases.
Output: Updated createSampleTasks() in page.tsx with 50 tasks across 7-8 parent groups.
</objective>

<execution_context>
@D:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@packages/website/src/app/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace createSampleTasks with 50-task structured dataset</name>
  <files>packages/website/src/app/page.tsx</files>
  <action>
Replace the entire `createSampleTasks` function body with a 50-task construction project. Keep the function signature identical (`const createSampleTasks = (): Task[] => {`). Remove the unused `baseDate`/`addDays`/`pad` helpers inside it since dates will be hardcoded ISO strings.

Structure the 50 tasks into these 8 parent groups with children, dependencies, and realistic details:

**GROUP 1 — Подготовительные работы (parent id: "g1", ids: "g1-1" .. "g1-5")**
- Parent "g1": 2026-02-01 → 2026-02-15, progress 100, accepted true, locked true, no dependencies
- Child "g1-1": Геодезическая разбивка, 2026-02-01 → 2026-02-03, progress 100, accepted true, parentId "g1"
- Child "g1-2": Ограждение площадки, 2026-02-03 → 2026-02-07, progress 100, accepted true, parentId "g1", dep on g1-1 FS lag 0
- Child "g1-3": Временные дороги, 2026-02-05 → 2026-02-10, progress 100, accepted true, parentId "g1", dep on g1-1 SS lag 2
- Child "g1-4": Подключение временных коммуникаций, 2026-02-08 → 2026-02-12, progress 100, accepted false, parentId "g1", dep on g1-2 FS lag 1
- Child "g1-5": Установка строительного городка, 2026-02-10 → 2026-02-15, progress 100, accepted true, parentId "g1", dep on g1-3 FS lag 0

**GROUP 2 — Земляные работы (parent id: "g2", ids: "g2-1" .. "g2-5"), divider: "top" on parent**
- Parent "g2": 2026-02-16 → 2026-03-01, progress 100, accepted true, divider "top"
- Child "g2-1": Разработка котлована, 2026-02-16 → 2026-02-22, progress 100, accepted true, parentId "g2", dep on g1 FS lag 1
- Child "g2-2": Вывоз грунта, 2026-02-17 → 2026-02-23, progress 100, accepted true, parentId "g2", dep on g2-1 SS lag 1
- Child "g2-3": Зачистка дна котлована, 2026-02-23 → 2026-02-25, progress 100, accepted true, parentId "g2", dep on g2-1 FS lag 0
- Child "g2-4": Песчаная подушка, 2026-02-25 → 2026-02-27, progress 100, accepted true, parentId "g2", dep on g2-3 FS lag 0, color "#4ade80"
- Child "g2-5": Уплотнение основания, 2026-02-27 → 2026-03-01, progress 100, accepted true, parentId "g2", dep on g2-4 FS lag 0

**GROUP 3 — Фундамент (parent id: "g3", ids: "g3-1" .. "g3-7"), divider: "top" on parent**
- Parent "g3": 2026-03-02 → 2026-03-28, progress 85, accepted false, divider "top"
- Child "g3-1": Опалубка фундамента, 2026-03-02 → 2026-03-06, progress 100, accepted true, parentId "g3", dep on g2 FS lag 1
- Child "g3-2": Армирование подошвы, 2026-03-04 → 2026-03-09, progress 100, accepted true, parentId "g3", dep on g3-1 SS lag 2
- Child "g3-3": Бетонная подготовка, 2026-03-07 → 2026-03-10, progress 100, accepted true, parentId "g3", dep on g3-1 FS lag 1, color "#60a5fa"
- Child "g3-4": Бетонирование фундамента, 2026-03-10 → 2026-03-16, progress 100, accepted false, parentId "g3", dep on g3-2 FF lag 0 (both finish around same time)
- Child "g3-5": Уход за бетоном, 2026-03-15 → 2026-03-22, progress 80, accepted false, parentId "g3", dep on g3-4 FS lag -1
- Child "g3-6": Гидроизоляция, 2026-03-22 → 2026-03-26, progress 60, accepted false, parentId "g3", dep on g3-5 FS lag 0, color "#f59e0b"
- Child "g3-7": Обратная засыпка, 2026-03-26 → 2026-03-28, progress 40, accepted false, parentId "g3", dep on g3-6 FS lag 0

**GROUP 4 — Каркас здания (parent id: "g4", ids: "g4-1" .. "g4-6"), divider: "top" on parent**
- Parent "g4": 2026-03-29 → 2026-05-10, progress 45, accepted false, divider "top"
- Child "g4-1": Монтаж колонн 1 этажа, 2026-03-29 → 2026-04-05, progress 80, accepted false, parentId "g4", dep on g3 FS lag 1
- Child "g4-2": Монтаж балок перекрытия, 2026-04-03 → 2026-04-12, progress 70, accepted false, parentId "g4", dep on g4-1 SS lag 5
- Child "g4-3": Монтаж плит перекрытия, 2026-04-10 → 2026-04-18, progress 55, accepted false, parentId "g4", dep on g4-2 FF lag -2
- Child "g4-4": Монтаж колонн 2 этажа, 2026-04-15 → 2026-04-24, progress 35, accepted false, parentId "g4", dep on g4-3 SS lag 5
- Child "g4-5": Перекрытие 2 этажа, 2026-04-22 → 2026-05-01, progress 20, accepted false, parentId "g4", dep on g4-4 SS lag 5
- Child "g4-6": Монтаж стропил, 2026-05-01 → 2026-05-10, progress 10, accepted false, parentId "g4", dep on g4-5 FS lag 0

**GROUP 5 — Кровля (parent id: "g5", ids: "g5-1" .. "g5-4"), divider: "top" on parent**
- Parent "g5": 2026-05-10 → 2026-05-30, progress 5, accepted false, divider "top"
- Child "g5-1": Монтаж обрешётки, 2026-05-10 → 2026-05-15, progress 15, accepted false, parentId "g5", dep on g4 FS lag 0
- Child "g5-2": Укладка утеплителя, 2026-05-13 → 2026-05-20, progress 5, accepted false, parentId "g5", dep on g5-1 SS lag 3
- Child "g5-3": Монтаж кровельного покрытия, 2026-05-18 → 2026-05-27, progress 0, accepted false, parentId "g5", dep on g5-1 FS lag 3
- Child "g5-4": Водосточная система, 2026-05-25 → 2026-05-30, progress 0, accepted false, parentId "g5", dep on g5-3 FF lag 3

**GROUP 6 — Наружные стены и фасад (parent id: "g6", ids: "g6-1" .. "g6-5"), divider: "top" on parent**
- Parent "g6": 2026-05-01 → 2026-06-20, progress 10, accepted false, divider "top"
- Child "g6-1": Кладка наружных стен 1 эт., 2026-05-01 → 2026-05-18, progress 20, accepted false, parentId "g6", dep on g4-3 FS lag 13
- Child "g6-2": Кладка наружных стен 2 эт., 2026-05-15 → 2026-06-01, progress 5, accepted false, parentId "g6", dep on g6-1 SS lag 14
- Child "g6-3": Монтаж оконных блоков, 2026-06-01 → 2026-06-10, progress 0, accepted false, parentId "g6", dep on g6-2 FS lag 0
- Child "g6-4": Утепление фасада, 2026-06-05 → 2026-06-15, progress 0, accepted false, parentId "g6", dep on g6-3 SS lag 4
- Child "g6-5": Финишная отделка фасада, 2026-06-12 → 2026-06-20, progress 0, accepted false, parentId "g6", dep on g6-4 FF lag 5, color "#a78bfa"

**GROUP 7 — Инженерные сети (parent id: "g7", ids: "g7-1" .. "g7-5"), divider: "top" on parent**
- Parent "g7": 2026-05-15 → 2026-07-01, progress 5, accepted false, divider "top"
- Child "g7-1": Разводка электросетей, 2026-05-15 → 2026-06-01, progress 10, accepted false, parentId "g7", dep on g4-3 FS lag 27
- Child "g7-2": Сантехнические работы, 2026-05-20 → 2026-06-10, progress 5, accepted false, parentId "g7", dep on g7-1 SS lag 5
- Child "g7-3": Вентиляция и кондиционирование, 2026-06-01 → 2026-06-20, progress 0, accepted false, parentId "g7", dep on g7-1 FS lag 0
- Child "g7-4": Слаботочные системы (охрана/связь), 2026-06-10 → 2026-06-25, progress 0, accepted false, parentId "g7", dep on g7-3 SS lag 9, color "#38bdf8"
- Child "g7-5": Испытание и сдача сетей, 2026-06-25 → 2026-07-01, progress 0, accepted false, parentId "g7", dep on g7-2 FS lag 15 (and dep on g7-4 SF lag 0 — starts when slabotochka finishes)

**GROUP 8 — Внутренняя отделка и сдача (parent id: "g8", ids: "g8-1" .. "g8-5"), divider: "top" on parent**
- Parent "g8": 2026-07-01 → 2026-08-15, progress 0, accepted false, divider "top"
- Child "g8-1": Штукатурка стен, 2026-07-01 → 2026-07-18, progress 0, accepted false, parentId "g8", dep on g7 FS lag 0
- Child "g8-2": Стяжка пола, 2026-07-05 → 2026-07-20, progress 0, accepted false, parentId "g8", dep on g8-1 SS lag 4
- Child "g8-3": Чистовая отделка, 2026-07-20 → 2026-08-05, progress 0, accepted false, parentId "g8", dep on g8-1 FS lag 2
- Child "g8-4": Установка дверей и фурнитуры, 2026-07-28 → 2026-08-08, progress 0, accepted false, parentId "g8", dep on g8-3 SS lag 8
- Child "g8-5": Сдача объекта, 2026-08-10 → 2026-08-15, progress 0, accepted false, parentId "g8", dep on g8-3 FF lag 10, locked false

Total: 8 parents + 5+5+7+6+4+5+5+5 = 42 children = 50 tasks exactly.

Implementation notes:
- Remove the old body of `createSampleTasks` completely (including unused `baseDate`, `pad`, `addDays` vars)
- Return a plain array literal with all 50 task objects
- Every dependency `taskId` must reference an `id` that exists in the array
- Use `as const` on dependency type strings (e.g., `'FS' as const`)
- Also remove the unused `baseDate`/`addDays`/`pad` helpers that were originally inside the function
  </action>
  <verify>
    <automated>cd /d/Projects/gantt-lib && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
- createSampleTasks returns exactly 50 tasks
- No TypeScript errors (build passes)
- Tasks have parentId relationships creating 8 visible groups
- Multiple dependency types (FS, SS, FF, SF) present in the array
- First chart on the main page shows nested structure with expand/collapse
  </done>
</task>

</tasks>

<verification>
After implementing, visually verify the main page first chart shows:
- 8 collapsible parent task groups
- Children with indentation and hierarchy connectors
- Dependency arrows of different types visible on the gantt bars
- Timeline spans Feb 2026 to Aug 2026
</verification>

<success_criteria>
createSampleTasks() returns 50 tasks with parentId nesting, all 4 dependency types (FS/SS/FF/SF), mixed progress values, colors, dividers, and locked/accepted flags. TypeScript build passes without errors.
</success_criteria>

<output>
No SUMMARY.md needed for quick tasks.
</output>
