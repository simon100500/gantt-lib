# Phase 25: columns-refactoring - Research

**Researched:** 2026-03-29
**Domain:** React TypeScript refactoring — unified column pipeline for TaskList component
**Confidence:** HIGH

## Summary

Phase 25 — чисто внутренний рефакторинг без изменения публичного поведения. Все архитектурные решения зафиксированы в CONTEXT.md (PRD Express Path). Исследование кода показало точное состояние текущей реализации: дублированная логика в header/body, `editor` вместо `renderEditor`, строковые ширины, `as Task[]` касты на границе GanttChart → TaskList.

Рефакторинг разбит на 5 фаз (A–E): структурные основы → унификация рендера → унификация редактора → дженерики → cleanup. Каждая фаза атомарна и не ломает существующий UI.

**Primary recommendation:** Следовать плану A→B→C→D→E строго последовательно. Фаза A (resolver + types) — самая безопасная точка для тестов. Фазы B/C — высокий риск регрессий, нужны тесты перед изменениями.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Column Contract:**
- Единый интерфейс `TaskListColumn<TTask>` для built-in и custom колонок
- `width` только числовой (px), без строковых CSS значений
- `renderEditor` вместо `editor` для ясности назначения
- `editable` опциональное поле для декларативной ясности
- `before`/`after` anchoring для позиционирования относительно любой колонки
- `updateTask` типизирован как `Partial<TTask>`

**Column Resolution:**
- Built-in base order: number → name → startDate → endDate → duration → progress → dependencies → actions
- Custom колонки обрабатываются в порядке предоставления consumer'ом
- `after` anchor: вставка сразу после указанной колонки
- `before` anchor: вставка сразу перед указанной колонкой
- Без anchor → вставка после `name`
- Невалидный anchor → fallback после `name`
- Дупликаты id: предсказуемый fail в dev, документированное поведение в prod
- Single-pass insertion strategy, без graph-based ordering

**Rendering Model:**
- Header и body рендерятся из одного `resolvedColumns` массива
- Каждая строка итерирует `resolvedColumns.map(column => ...)`
- Header рендерится аналогично: `resolvedColumns.map(column => ...)`

**Editor Lifecycle:**
- Один `editingColumnId` state на строку: `useState<string | null>(null)`
- Только один editor открыт на строку в один момент
- `openEditor()` / `closeEditor()` через column context
- `updateTask()` через `onTasksChange` с merged full task patch
- Built-in и custom колонки используют один механизм

**Width Model:**
- Только числовые ширины (px)
- Total width = сумма resolved column widths
- `effectiveTaskListWidth = max(requestedTaskListWidth, resolvedColumnWidthTotal)`
- Нет парсинга CSS строк

**Generic Flow:**
- Generics сохраняются через всю цепочку: `GanttChart<TTask>` → `TaskList<TTask>` → `TaskListRow<TTask>` → `TaskListColumn<TTask>` → `TaskListColumnContext<TTask>`
- Нет сужения до base `Task` кроме случаев legacy утилит (конверсия остаётся локальной)
- Публичный API не требует `as TaskListColumn<Task>[]` кастов

**File Structure:**
- `columns/types.ts` — shared column types
- `columns/createBuiltInColumns.tsx` — factory для built-in column declarations
- `columns/resolveTaskListColumns.ts` — pure resolver для финального порядка колонок
- `TaskList.tsx` — resolve columns + render header/body containers
- `TaskListRow.tsx` — render row по resolved columns, row-level editor state
- `TaskListCell.tsx` — optional wrapper для per-cell editor/render behavior
- `cells/*` — extracted built-in cell implementations для сложных ячеек

**Migration Strategy (Phase Order):**
- Phase A: Structural Foundations (types, resolver с тестами, built-in column factory)
- Phase B: Render Unification (header → resolvedColumns, row → resolvedColumns)
- Phase C: Editor Unification (единый editingColumnId, shared editor model)
- Phase D: Generic Tightening (generic TaskList/TaskListRow, убрать `as Task` касты)
- Phase E: Cleanup (dead code, obsolete width helpers, документация API)

### Claude's Discretion
- Конкретная реализация `TaskListCell.tsx` wrapper'а (может быть optional)
- Extraction strategy для сложных built-in cell implementations в `cells/*`
- Внутренняя организация тестов (файловая структура, test utilities)
- Детали memoization для resolved columns
- Порядок рефакторинга конкретных built-in editable колонок в Phase C

### Deferred Ideas (OUT OF SCOPE)
- Hide/show columns API
- User-driven column ordering (drag-to-reorder)
- Resizable columns
- Persistent column preferences
- Virtualization optimization
- Full plugin framework for columns
- Advanced layout engine (CSS grid templates)
- Support for arbitrary string width parsing
</user_constraints>

---

## Current Implementation Audit

### Что сейчас есть (точное состояние)

**`taskListColumns.ts`** — текущий тип:
```ts
export interface TaskListColumn<TTask extends Task = Task> {
  id: string;
  header: ReactNode;
  renderCell: (row: TaskListColumnContext<TTask>) => ReactNode;
  editor?: (row: TaskListColumnContext<TTask>) => ReactNode;  // RENAME → renderEditor
  width?: string | number;  // CHANGE → number only
  after?: BuiltInTaskListColumnId;  // EXPAND → before/after any string + {} anchor
  meta?: Record<string, unknown>;
}
```

**`columnId` в context:** Есть в текущем `TaskListColumnContext`, но в решениях его нет в новом контракте — нужно сохранить или убрать осознанно.

**`TaskList.tsx`** — что нужно изменить:
- Строки 887–897: hardcoded custom columns after `name` в header
- Строки 902–912: hardcoded custom columns after `progress` в header
- Строки 848–866: `additionalColumnsByAnchor` bucket logic (замена на resolver)
- Строки 849–853: `normalizeColumnWidth` + `getColumnWidthPx` (упразднить — только числа)
- `TaskListProps.additionalColumns?: TaskListColumn<Task>[]` → нужно сделать generic

**`TaskListRow.tsx`** — что нужно изменить:
- Строка 783: `editingCustomColumnId` → переименовать в `editingColumnId`, распространить на built-in
- Строки 1857–1903: дублированный custom column render block после `name`
- Строки 2110–2156: дублированный custom column render block после `progress`
- Props `additionalColumnsByAnchor?: Record<string, TaskListColumn<Task>[]>` → заменить на `resolvedColumns: TaskListColumn<TTask>[]`
- Текущий `editor` в контексте ссылается на `col.editor` — заменить на `col.renderEditor`

**`GanttChart.tsx`** — строка 925: каст `additionalColumns as TaskListColumn<Task>[] | undefined` — убрать после дженерик-подъёма

### Дублирование кода (количественно)

Блок рендера custom column повторяется 2 раза в `TaskListRow.tsx` (after `name`, after `progress`) и 2 раза в header `TaskList.tsx`. После рефакторинга — один `resolvedColumns.map(...)` в каждом месте.

---

## Architecture Patterns

### Recommended File Structure (target)

```
packages/gantt-lib/src/components/TaskList/
├── columns/
│   ├── types.ts               # TaskListColumn<TTask>, TaskListColumnContext<TTask>, anchors
│   ├── createBuiltInColumns.tsx  # factory: returns TaskListColumn<TTask>[]
│   └── resolveTaskListColumns.ts # pure: (builtIn[], custom[]) => TaskListColumn<TTask>[]
├── cells/                     # extracted built-in cell implementations (complex ones)
│   ├── NameCell.tsx           # name editing + hierarchy UI
│   ├── DurationCell.tsx       # duration editing
│   ├── ProgressCell.tsx       # progress editing
│   ├── StartDateCell.tsx      # date picker cell
│   ├── EndDateCell.tsx        # date picker cell
│   └── DependenciesCell.tsx   # complex dep picker UI
├── TaskListCell.tsx           # optional thin wrapper (per Claude's discretion)
├── TaskList.tsx               # resolve + width + header + body
├── TaskListRow.tsx            # generic TTask, single editingColumnId
└── taskListColumns.ts         # re-export from columns/types.ts (backward compat)
```

### Pattern 1: Pure Resolver

```typescript
// columns/resolveTaskListColumns.ts
export function resolveTaskListColumns<TTask extends Task>(
  builtIn: TaskListColumn<TTask>[],
  custom: TaskListColumn<TTask>[]
): TaskListColumn<TTask>[] {
  const result = [...builtIn];
  for (const col of custom) {
    const anchor = extractAnchor(col); // { after: string } | { before: string } | {}
    const targetId = 'after' in anchor ? anchor.after
                   : 'before' in anchor ? anchor.before
                   : 'name'; // default
    const idx = result.findIndex(c => c.id === targetId);
    const insertAt = idx === -1
      ? result.findIndex(c => c.id === 'name') + 1  // fallback
      : 'after' in anchor ? idx + 1 : idx;
    result.splice(insertAt, 0, col);
  }
  return result;
}
```

### Pattern 2: Built-In Column Factory

Built-in колонки становятся `TaskListColumn<TTask>` объектами с `renderCell` / `renderEditor`:

```typescript
// columns/createBuiltInColumns.tsx
export function createBuiltInColumns<TTask extends Task>(opts: {
  onTasksChange?: (tasks: TTask[]) => void;
  disableTaskNameEditing?: boolean;
  // ... другие props нужные для built-in cells
}): TaskListColumn<TTask>[] {
  return [
    {
      id: 'number',
      header: '№',
      width: 40,
      renderCell: (ctx) => <NumberCell task={ctx.task as Task} />,
    },
    // ... остальные built-in
  ];
}
```

**Важно:** Для built-in колонок `renderCell` внутри может кастить `ctx.task as Task` — это legit локальный каст, он не протекает в публичный API.

### Pattern 3: Unified Row Render

```typescript
// TaskListRow.tsx (after Phase B/C)
const [editingColumnId, setEditingColumnId] = useState<string | null>(null);

return (
  <div className="gantt-tl-row" ...>
    {resolvedColumns.map(col => {
      const isEditing = editingColumnId === col.id;
      const ctx: TaskListColumnContext<TTask> = {
        task,
        rowIndex,
        isEditing,
        openEditor: () => setEditingColumnId(col.id),
        closeEditor: () => setEditingColumnId(null),
        updateTask: (patch) => {
          onTasksChange?.([{ ...task, ...patch }]);
          setEditingColumnId(null);
        },
      };
      return (
        <div key={col.id} style={{ width: col.width ?? DEFAULT_COL_WIDTH }}>
          {isEditing && col.renderEditor
            ? col.renderEditor(ctx)
            : col.renderCell(ctx)}
        </div>
      );
    })}
  </div>
);
```

### Pattern 4: Width Calculation

```typescript
// В TaskList.tsx
const DEFAULT_COLUMN_WIDTHS: Record<BuiltInTaskListColumnId, number> = {
  number: 40,
  name: 200,
  startDate: 90,
  endDate: 90,
  duration: 60,
  progress: 50,
  dependencies: 120,
  actions: 80,
};

const resolvedColumnWidthTotal = useMemo(
  () => resolvedColumns.reduce((sum, col) => sum + (col.width ?? DEFAULT_COLUMN_WIDTHS[col.id as BuiltInTaskListColumnId] ?? 120), 0),
  [resolvedColumns]
);

const effectiveTaskListWidth = Math.max(taskListWidth ?? MIN_TASK_LIST_WIDTH, resolvedColumnWidthTotal);
```

### Anti-Patterns to Avoid

- **Не сохранять `additionalColumnsByAnchor` bucket:** bucket логика → resolver в Phase A, не откладывать
- **Не делать `resolvedColumns` в TaskListRow:** resolve только в TaskList, в Row передавать уже готовый массив через prop
- **Не смешивать Phase B и Phase C:** сначала довести рендер до `resolvedColumns.map(...)` с текущим editor механизмом, потом переключать editor lifecycle — меньше конфликтов
- **Не делать `TaskListCell.tsx` обязательным на этапе B:** если решить что не нужен — пропустить
- **Не использовать строковые ширины нигде в width model:** даже в дефолтах

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Граф зависимостей колонок для ordering | Custom DAG | Single-pass insertion (решено в PRD) | Граф избыточен для детерминированного порядка |
| CSS width parsing | `parseInt(width)` | Numeric-only contract | Неточно, ломается на `calc()`, `%` и т.д. |
| Deep clone task при `updateTask` | Свой merge | `{ ...task, ...patch }` | Spread достаточен для flat patch |

---

## Common Pitfalls

### Pitfall 1: Сломать встроенные редакторы при Phase C

**What goes wrong:** При переходе на единый `editingColumnId` имена built-in редакторов (`editingName`, `editingDuration`, `editingProgress`) конфликтуют с новым механизмом — два state'а управляют одним UI.

**Why it happens:** Phase C требует, чтобы встроенные редакторы тоже использовали `editingColumnId === 'name'`, но они сейчас управляются отдельными `useState<boolean>`.

**How to avoid:** В Phase C мигрировать встроенные редакторы один за другим, каждый раз запуская тесты. Начинать с простых (duration, progress), заканчивать сложными (name с autoEdit, dep picker).

**Warning signs:** Двойное срабатывание editor или editor, не открывающийся на click.

### Pitfall 2: `columnId` в `TaskListColumnContext`

**What goes wrong:** Текущий `TaskListColumnContext` имеет поле `columnId: string`. В новом контракте из CONTEXT.md его нет. Если удалить — сломаются существующие custom columns потребителей.

**Why it happens:** Несоответствие текущего и целевого контрактов.

**How to avoid:** Проверить, используется ли `columnId` в existing тестах (`taskListColumns.test.tsx`). Если используется — либо сохранить поле, либо мигрировать тест. В новом `TaskListColumnContext` поля нет по спецификации — нужно осознанно решить.

**Статус:** В тестовом файле (`taskListColumns.test.tsx` строки 19–33) поле `columnId` не используется в `renderCell` колбэках. Можно безопасно убрать.

### Pitfall 3: `editor` vs `renderEditor` — backward compatibility

**What goes wrong:** Текущий тип `TaskListColumn` имеет `editor?`. Тест `taskListColumns.test.tsx` строки 27–32 использует `editor:` поле. После переименования в `renderEditor` тест сломается.

**Why it happens:** Phase A меняет типы, но тесты не обновляются одновременно.

**How to avoid:** В Phase A обновить тип + обновить тест одновременно. Не оставлять `editor` как deprecated alias.

### Pitfall 4: `TaskListRow` получает слишком много props

**What goes wrong:** Сейчас `TaskListRow` принимает `additionalColumnsByAnchor`. После рефакторинга должен принимать `resolvedColumns`. Если переход не полный — оба prop'а существуют одновременно.

**Why it happens:** Поэтапная миграция создает временное дублирование интерфейса.

**How to avoid:** В Phase B сразу заменить `additionalColumnsByAnchor` на `resolvedColumns` в `TaskListRowProps`. Убрать старый prop полностью, не сохранять оба.

### Pitfall 5: Выравнивание header/body при числовых ширинах

**What goes wrong:** Текущий код использует `width` + `minWidth` в CSS для custom колонок. Built-in колонки задаются через CSS классы (`.gantt-tl-cell-name`, etc.). После унификации header ячейки и body ячейки должны задавать ширину одинаково.

**Why it happens:** Смешанная модель ширин — часть через CSS, часть через inline style.

**How to avoid:** В Phase B при переходе на `resolvedColumns.map(...)` использовать inline `style={{ width: col.width }}` для ВСЕХ колонок (и built-in, и custom). CSS классы оставить только для прочих стилей, не для ширины. Альтернативно — сохранить CSS-классы для built-in, но тогда built-in должны иметь `width` в числах совпадающие с CSS. Проще всего — числовые ширины везде, CSS для визуального оформления.

### Pitfall 6: Generic инференс TypeScript при `createBuiltInColumns`

**What goes wrong:** `createBuiltInColumns<TTask>()` вызывает `ctx.task as Task` внутри — это корректно, но `renderCell` в возвращаемом объекте должна иметь тип `(ctx: TaskListColumnContext<TTask>) => ReactNode`. Если factory возвращает `TaskListColumn<Task>[]`, дженерик не прокидывается.

**Why it happens:** Built-in колонки знают только о базовом `Task`, но тип должен быть `TaskListColumn<TTask>`.

**How to avoid:** Factory принимает `TTask extends Task` как generic и возвращает `TaskListColumn<TTask>[]`. Внутри `renderCell` — локальный каст `ctx.task as Task` для доступа к built-in полям. TypeScript считает это безопасным (narrowing в приватной реализации).

---

## Code Examples

### Текущий тип (Phase A вход)

```typescript
// taskListColumns.ts — CURRENT
export interface TaskListColumn<TTask extends Task = Task> {
  id: string;
  header: ReactNode;
  renderCell: (row: TaskListColumnContext<TTask>) => ReactNode;
  editor?: (row: TaskListColumnContext<TTask>) => ReactNode;   // → renderEditor
  width?: string | number;                                     // → number only
  after?: BuiltInTaskListColumnId;                             // → TaskListColumnAnchor
  meta?: Record<string, unknown>;
}
```

### Целевой тип (Phase A выход)

```typescript
// columns/types.ts — TARGET
export type TaskListColumnAnchor =
  | { after: BuiltInTaskListColumnId | string }
  | { before: BuiltInTaskListColumnId | string }
  | {};

export interface TaskListColumnContext<TTask extends Task> {
  task: TTask;
  rowIndex: number;
  isEditing: boolean;
  openEditor: () => void;
  closeEditor: () => void;
  updateTask: (patch: Partial<TTask>) => void;
}

export interface TaskListColumn<TTask extends Task> extends TaskListColumnAnchor {
  id: string;
  header: React.ReactNode;
  width?: number;
  minWidth?: number;
  editable?: boolean;
  renderCell: (ctx: TaskListColumnContext<TTask>) => React.ReactNode;
  renderEditor?: (ctx: TaskListColumnContext<TTask>) => React.ReactNode;
  meta?: Record<string, unknown>;
}
```

### Resolver (Phase A)

```typescript
// columns/resolveTaskListColumns.ts
export function resolveTaskListColumns<TTask extends Task>(
  builtIn: TaskListColumn<TTask>[],
  custom: TaskListColumn<TTask>[]
): TaskListColumn<TTask>[] {
  // dev mode duplicate check
  if (process.env.NODE_ENV !== 'production') {
    const ids = new Set<string>();
    for (const col of [...builtIn, ...custom]) {
      if (ids.has(col.id)) {
        console.error(`[TaskList] Duplicate column id: "${col.id}"`);
      }
      ids.add(col.id);
    }
  }

  const result = [...builtIn];
  for (const col of custom) {
    const anchor = col as TaskListColumnAnchor;
    let insertAt: number;

    if ('after' in anchor && anchor.after) {
      const idx = result.findIndex(c => c.id === anchor.after);
      insertAt = idx !== -1 ? idx + 1 : result.findIndex(c => c.id === 'name') + 1;
    } else if ('before' in anchor && anchor.before) {
      const idx = result.findIndex(c => c.id === anchor.before);
      insertAt = idx !== -1 ? idx : result.findIndex(c => c.id === 'name') + 1;
    } else {
      // No anchor or invalid — insert after 'name'
      insertAt = result.findIndex(c => c.id === 'name') + 1;
    }

    result.splice(insertAt, 0, col);
  }
  return result;
}
```

---

## Migration Phases Detail

### Phase A: Structural Foundations
**Scope:** Только типы и resolver. Никаких изменений UI.

Files changed:
- Создать `columns/types.ts` (новые типы)
- Создать `columns/resolveTaskListColumns.ts` (pure function)
- Создать `columns/__tests__/resolveTaskListColumns.test.ts`
- Обновить `taskListColumns.ts` — re-export из `columns/types.ts` для backward compat
- Обновить `taskListColumns.test.tsx` — `editor` → `renderEditor` в тестовых данных

**Risk:** LOW. Только новые файлы + export bridge.

### Phase B: Render Unification
**Scope:** Header и body рендерятся из `resolvedColumns`. UI не меняется.

Files changed:
- `columns/createBuiltInColumns.tsx` — factory с render logic для каждой built-in колонки
- `TaskList.tsx` — `resolvedColumns = useMemo(...)`, header через `map`, pass `resolvedColumns` в `TaskListRow`
- `TaskListRow.tsx` — принимает `resolvedColumns: TaskListColumn<TTask>[]` вместо `additionalColumnsByAnchor`, рендерит через `map`

**Risk:** HIGH. Затрагивает весь рендер строки. Нужно протестировать все built-in колонки.

**Key challenge:** Built-in ячейки (name с hierarchy UI, dependencies с picker) очень сложные. Возможны два подхода:
1. Вынести сложные built-in ячейки в `cells/` компоненты ПЕРЕД Phase B (чище)
2. В `renderCell` built-in колонки вызывать существующие inline JSX блоки через функции

Рекомендуется вариант 1: сначала извлечь `NameCell`, `DependenciesCell`, `ActionsCell` в `cells/`, потом делать Phase B.

### Phase C: Editor Unification
**Scope:** Единый `editingColumnId` управляет всеми редакторами в строке.

Files changed:
- `TaskListRow.tsx` — `editingName`/`editingDuration`/`editingProgress` → `editingColumnId === 'name'` etc.

**Risk:** HIGH. Много мест используют boolean editing state. `autoEdit` логика (строки 957–969) должна перейти на `setEditingColumnId('name')`.

### Phase D: Generic Tightening
**Scope:** `TaskList<TTask>`, `TaskListRow<TTask>` дженерики. Убрать `as Task[]` касты.

Files changed:
- `TaskList.tsx` — generic component
- `TaskListRow.tsx` — generic component
- `GanttChart.tsx` — убрать `as TaskListColumn<Task>[]`
- `taskListColumns.test.tsx` — убрать `as TaskListColumn<Task>[]`

**Risk:** MEDIUM. TypeScript может требовать явных аннотаций в нескольких местах.

### Phase E: Cleanup
**Scope:** Удалить dead code, обновить docs.

Files changed:
- Удалить `normalizeColumnWidth`, `getColumnWidthPx` из `TaskList.tsx`
- Удалить `additionalColumnsByAnchor` bucket logic
- Обновить JSDoc в `TaskListColumn`, `GanttChart`

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react |
| Config file | `packages/gantt-lib/vitest.config.ts` |
| Quick run command | `cd packages/gantt-lib && npx vitest run src/__tests__/taskListColumns.test.tsx` |
| Full suite command | `cd packages/gantt-lib && npx vitest run` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| Resolver: insert after/before any anchor | unit | `npx vitest run src/__tests__/resolveTaskListColumns.test.ts` | ❌ Wave 0 |
| Resolver: fallback on missing anchor | unit | same | ❌ Wave 0 |
| Resolver: handle duplicate ids | unit | same | ❌ Wave 0 |
| Header/body matching order | integration | `npx vitest run src/__tests__/taskListColumns.test.tsx` | ✅ |
| Custom columns in resolved positions | integration | same | ✅ (partial) |
| Width grows correctly from numeric widths | integration | same | ❌ Wave 0 |
| Custom editor open/close | integration | same | ✅ (partial) |
| Single-editor-per-row | integration | ❌ Wave 0 | ❌ Wave 0 |
| `updateTask` preserves TTask fields | integration | ❌ Wave 0 | ❌ Wave 0 |
| Extended task type compiles without casts | type-level | `npx tsc --noEmit` | ✅ (after Phase D) |

### Sampling Rate
- **Per task commit (Phase A):** `npx vitest run src/__tests__/resolveTaskListColumns.test.ts`
- **Per task commit (Phases B-E):** `npx vitest run src/__tests__/taskListColumns.test.tsx`
- **Per wave merge:** `cd packages/gantt-lib && npx vitest run`
- **Phase gate:** Full suite green + `npx tsc --noEmit` before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/resolveTaskListColumns.test.ts` — unit tests для pure resolver (Phase A)
- [ ] Добавить тесты для: numeric-only width model, single-editor-per-row, `updateTask` generic preservation

---

## Sources

### Primary (HIGH confidence)
- Прямое чтение исходного кода `TaskList.tsx`, `TaskListRow.tsx`, `taskListColumns.ts`, `GanttChart.tsx`
- `.planning/phases/23-additional-tasklist-columns/23-REFRACTOR-PRD.md` — полная спецификация рефакторинга
- `25-CONTEXT.md` — зафиксированные архитектурные решения

### Secondary (MEDIUM confidence)
- Существующие тесты в `src/__tests__/taskListColumns.test.tsx` — понимание текущего поведения
- `vitest.config.ts` — конфигурация тест-фреймворка

## Metadata

**Confidence breakdown:**
- Current implementation state: HIGH — прямое чтение кода
- Target architecture: HIGH — зафиксировано в CONTEXT.md из PRD
- Migration risks: HIGH — выявлены через анализ конкретных строк кода
- Pitfalls: HIGH — выведены из конкретных несоответствий текущего и целевого состояний

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (стабильный домен, TypeScript/React паттерны не меняются)
