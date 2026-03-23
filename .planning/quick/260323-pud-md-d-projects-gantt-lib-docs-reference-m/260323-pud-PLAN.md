---
phase: quick
plan: 260323-pud
type: execute
wave: 1
depends_on: []
files_modified: ["docs/REFERENCE.md", "docs/reference/*.md"]
autonomous: true
requirements: [DOC-REF-001]

must_haves:
  truths:
    - "Документация разбита на отдельные файлы по главам"
    - "Создано оглавление (INDEX или SIDEBAR) для навигации"
    - "Структура совместима с оболочками документации (Docusaurus, GitBook)"
    - "Все секции из текущего REFERENCE.md сохранены"
  artifacts:
    - path: "docs/reference/INDEX.md"
      provides: "Оглавление с ссылками на главы"
    - path: "docs/reference/01-installation.md"
      provides: "Инструкция по установке"
    - path: "docs/reference/02-task-interface.md"
      provides: "Интерфейс Task и иерархия"
    - path: "docs/reference/03-dependencies.md"
      provides: "Типы зависимостей (FS, SS, FF, SF)"
    - path: "docs/reference/04-props.md"
      provides: "Все пропсы GanttChart"
    - path: "docs/reference/05-filtering.md"
      provides: "API фильтрации задач"
    - path: "docs/reference/06-custom-days.md"
      provides: "Custom weekend API"
    - path: "docs/reference/07-business-days.md"
      provides: "Режим рабочих дней"
    - path: "docs/reference/08-ref-api.md"
      provides: "Ref methods (scrollToToday, collapseAll)"
    - path: "docs/reference/09-styling.md"
      provides: "CSS переменные"
    - path: "docs/reference/10-drag-interactions.md"
      provides: "Drag поведение"
    - path: "docs/reference/11-ai-agent-notes.md"
      provides: "Заметки для AI агентов"
  key_links:
    - from: "docs/reference/INDEX.md"
      to: "docs/reference/*.md"
      via: "Markdown ссылки"
---

<objective>
Рефакторинг документации REFERENCE.md в модульную структуру

Purpose: Текущий REFERENCE.md — монолитный файл 2500+ строк. Нужно разбить на главы для использования с оболочками документации (Docusaurus, GitBook, VitePress).

Output:
- Папка docs/reference/ с отдельными MD-файлами по главам
- INDEX.md с оглавлением
- Структура готова для интеграции с doc-tools
</objective>

<context>
@docs/REFERENCE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Разбить REFERENCE.md на главы и создать INDEX</name>
  <files>docs/REFERENCE.md, docs/reference/INDEX.md, docs/reference/*.md</files>
  <action>
1. Создать папку docs/reference/ если не существует

2. Разбить текущий docs/REFERENCE.md на файлы по секциям:

**01-installation.md** — Sections 1-3:
- Package Identity
- Installation
- Minimal Working Example

**02-task-interface.md** — Section 4:
- Task Interface
- Task Hierarchy (4.1)

**03-dependencies.md** — Sections 5-6:
- TaskDependency Interface
- Dependency Types (FS, SS, FF, SF)
- Cascade Behavior

**04-props.md** — Section 7 + subsections:
- GanttChart Props (таблица)
- 7.1 View Modes
- 7.2 Custom Days API
- 7.3 Task Filtering API
- 7.4 Controlled Collapse/Expand
- 7.5 Business Days Mode

**05-filtering.md** — Section 7.3 (detached from props for standalone):
- TaskPredicate Type
- Ready-Made Filters
- Boolean Composites
- Custom Predicates
- Filter Display Modes

**06-custom-days.md** — Section 7.2 (standalone):
- CustomDayConfig Type
- Adding Holidays
- Working Saturdays
- isWeekend predicate
- Precedence Order
- Usage Examples

**07-business-days.md** — Section 7.5 (standalone):
- businessDays prop
- Утилиты getBusinessDaysCount, addBusinessDays
- Примеры использования

**08-ref-api.md** — Section 8:
- GanttChartRef interface
- Methods (scrollToToday, scrollToTask, scrollToRow, collapseAll, expandAll)

**09-styling.md** — Section 9:
- CSS Variables table

**10-drag-interactions.md** — Section 10:
- Drag behaviors table
- Edge zones
- Snapping

**11-ai-agent-notes.md** — Sections 15-16:
- AI Agent Usage Notes
- Public Exports
- Performance Notes
- Known Constraints

**12-validation.md** — Sections 11-14:
- ValidationResult Type
- Date Handling Rules
- onTasksChange Pattern
- enableAutoSchedule vs onCascade

3. Создать INDEX.md с оглавлением:

```markdown
# gantt-lib API Reference

**Version:** 0.27.0

## Getting Started

- [Installation](./01-installation.md) — npm install, CSS import, minimal example
- [Task Interface](./02-task-interface.md) — Task properties and hierarchy
- [Dependencies](./03-dependencies.md) — FS/SS/FF/SF link types

## Core API

- [GanttChart Props](./04-props.md) — Complete props reference
- [Ref API](./08-ref-api.md) — Imperative methods (scrollToToday, collapseAll)

## Features

- [Task Filtering](./05-filtering.md) — Predicate-based filtering API
- [Custom Weekends](./06-custom-days.md) — Holidays, working Saturdays, isWeekend
- [Business Days](./07-business-days.md) — Режим рабочих дней

## Advanced

- [Drag Interactions](./10-drag-interactions.md) — Drag/resize behavior
- [Styling](./09-styling.md) — CSS variables
- [Validation](./12-validation.md) — Dependency validation, date handling

## AI Agents

- [AI Agent Notes](./11-ai-agent-notes.md) — Tips for AI code generation
```

4. Каждый файл главы:
- Добавить H1 заголовок (название главы)
- Сохранить всё содержимое секции без изменений
- Убрать нумерацию разделов из REFERENCE.md (например "## 4. Task Interface" → "## Task Interface")
- Добавить навигационные ссылки (вверх к оглавлению) внизу каждого файла

5. Оставить docs/REFERENCE.md как есть (для обратной совместимости) или заменить на редирект на INDEX.md

6. Не менять содержимое — только реструктуризация
  </action>
  <verify>
    <automated>ls docs/reference/ && wc -l docs/reference/*.md</automated>
  </verify>
  <done>
- Папка docs/reference/ создана
- 12 файлов глав созданы (01-12)
- INDEX.md с оглавлением существует
- Все секции из REFERENCE.md перенесены
- Структура готова для интеграции с Docusaurus/GitBook
  </done>
</task>

</tasks>

<verification>
- Все файлы глав существуют в docs/reference/
- INDEX.md содержит рабочие ссылки на главы
- Содержимое глав соответствует оригинальному REFERENCE.md
- Структура совместима с doc-tools (отдельные MD файлы)
</verification>

<success_criteria>
- Документация разбита на модульную структуру
- Оглавление позволяет навигацию между главами
- Готово для интеграции с оболочками документации
</success_criteria>

<output>
After completion, create `.planning/quick/260323-pud-md-d-projects-gantt-lib-docs-reference-m/260323-pud-SUMMARY.md`
</output>
