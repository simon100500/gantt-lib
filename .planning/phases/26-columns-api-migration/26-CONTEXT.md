# Phase 26: columns-api-migration - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Source:** PRD Express Path (d:\Projects\gantt-lib\.planning\phases\25-columns-refactoring\25-COLUMNS-API-MIGRATION-PRD.md)

<domain>
## Phase Boundary

Удаление legacy column editor API и enforcement нового единого контракта. После Phase 25 кодбаза всё ещё содержит следы старого API (`editor` property, fallback logic `col.renderEditor ?? (col as any).editor`). Эта фаза полностью убирает старый путь и делает новый контракт (`renderEditor`, numeric `width`, `before`/`after`) единственным поддерживаемым подходом.

Это cleanup/standardization фаза, НЕ feature фаза.

</domain>

<decisions>
## Implementation Decisions

### Runtime Cleanup
- Удалить fallback `col.renderEditor ?? (col as any).editor` из TaskListRow.tsx
- Использовать ТОЛЬКО `col.renderEditor` для кастомных редакторов
- Никакой runtime совместимости с legacy `editor` property

### Type Contract
- Единственный интерфейс: `TaskListColumn<TTask>` с `renderEditor` (не `editor`)
- Numeric `width` — единственный поддерживаемый формат ширины
- `before` / `after` — единственный способ размещения колонок
- `TaskListColumnAnchor` — anchor interface для placement

### Repo-Wide Cleanup
- Все примеры в website/demo должны использовать ТОЛЬКО `renderEditor`
- Все internal usage должен быть на новом API
- README сниппеты — только новый API

### Import Path Decision
- Удалить `taskListColumns.ts` bridge re-export полностью (hard break, Option B из PRD)
- Канонический импорт — из нового расположения типов
- Документировать breaking import-path change

### Migration Documentation
- Добавить короткую migration note: `editor` → `renderEditor`, numeric `width`, `before`/`after`
- Без deprecation периода — hard migration

### Claude's Discretion
- Конкретная структура migration note (формат, расположение)
- Порядок внутренних cleanup шагов
- Детали test verification после удаления legacy support

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Column Architecture (Phase 25 output)
- `packages/gantt-lib/src/components/TaskList/types.ts` — TaskListColumn interface definition
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — Runtime column rendering (target for editor fallback removal)
- `packages/gantt-lib/src/components/TaskList/columnResolver.ts` — Column resolution pipeline
- `packages/gantt-lib/src/components/TaskList/taskListColumns.ts` — Legacy bridge re-export (candidate for removal)

### PRD
- `.planning/phases/25-columns-refactoring/25-COLUMNS-API-MIGRATION-PRD.md` — Full PRD with acceptance criteria

### Examples & Docs
- `packages/website/` — Demo/example code using columns API

</canonical_refs>

<specifics>
## Specific Ideas

### Canonical Target API (from PRD §8)
```ts
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

### Acceptance Criteria (from PRD §12)
1. `TaskListRow.tsx` no longer supports `editor`
2. No repo examples use `editor`
3. No docs show `editor`
4. The only documented editor field is `renderEditor`
5. Column examples use numeric `width`
6. A maintainer can inspect the repo and find only one supported authoring style
7. Tests covering custom columns still pass after removing legacy support

### Test Plan (from PRD §13)
- Structural: search repo for `editor:` in column contexts, search for fallback logic
- Behavioral: existing custom column tests pass, editable columns work through `renderEditor`
- Documentation: README/website show only `renderEditor`, migration note present

</specifics>

<deferred>
## Deferred Ideas

- Plugin system or schema-based columns (explicitly out of scope per PRD §4)
- Temporary deprecation period (rejected — hard migration)
- Runtime compatibility bridge (rejected per PRD §4)

</deferred>

---

*Phase: 26-columns-api-migration*
*Context gathered: 2026-03-29 via PRD Express Path*
