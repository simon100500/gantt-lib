# Requirements: Gantt Chart Library for Next.js

**Defined:** 2026-03-17
**Core Value:** Drag-and-drop task scheduling with Excel-like visual simplicity

## v0.50.0 Requirements

Requirements for adding extensibility features — custom weekend calendar and additional TaskList columns.

### Custom Weekend Calendar

- [x] **CAL-01**: User can pass `weekends?: Date[]` prop to GanttChart for custom weekend dates
- [x] **CAL-02**: User can pass `isWeekend?: (date: Date) => boolean` prop to GanttChart for flexible weekend logic
- [x] **CAL-03**: Component highlights custom weekend dates with red background in GridBackground
- [x] **CAL-04**: Both props work together — isWeekend takes precedence if both provided
- [x] **CAL-05**: Default behavior (Saturday/Sunday) remains if no props passed

### Additional TaskList Columns

- [x] **COL-01**: User can pass `additionalColumns?: Column[]` prop to TaskList
- [x] **COL-02**: Column interface includes `id`, `header`, `renderCell`, optional `editor`, `width`, `after` [migrated to renderEditor in Phase 26]
- [x] **COL-03**: `renderCell: (row: GanttRow) => ReactNode` renders cell content for each row
- [x] **COL-04**: `editor?: (row: GanttRow) => ReactNode` provides inline editor component [migrated to renderEditor in Phase 26]
- [x] **COL-05**: `after?: string` positions column after specified base column (default: after 'Name')
- [x] **COL-06**: Base columns remain: №, Name, Dates, Dependencies, Actions
- [x] **COL-07**: Additional columns render inline, scroll with TaskList
- [x] **COL-08**: Column width is customizable via `width?: string | number`

### Phase 26: columns-api-migration

- [x] **MIG-01**: Legacy `editor` property удалён из runtime
- [x] **MIG-02**: Все примеры используют только `renderEditor`
- [x] **MIG-03**: Документация описывает только `renderEditor`
- [x] **MIG-04**: Единственный документированный editor field — `renderEditor`
- [x] **MIG-05**: Column examples используют numeric `width`
- [x] **MIG-06**: Один поддерживаемый стиль авторинга
- [x] **MIG-07**: Тесты проходят после удаления legacy support

## Current Extension Requirements

### Resource Planner Mode

- [x] **RP-01**: Existing `GanttChart` task mode remains backward compatible when `mode` is omitted
- [x] **RP-02**: `mode="resource-planner"` renders resource timeline without `tasks`
- [x] **RP-03**: Non-overlapping items in one resource occupy one lane
- [x] **RP-04**: Overlapping items occupy multiple lanes
- [x] **RP-05**: Resource row height grows with lane count and empty resources stay visible
- [x] **RP-06**: Horizontal drag emits changed dates and same resource id
- [x] **RP-07**: Vertical drag onto another resource emits new target resource id
- [x] **RP-08**: Drop outside resource rows emits no move
- [x] **RP-09**: `readonly` and `item.locked` disable resource drag
- [x] **RP-10**: `renderItem` and `getItemClassName` customize item content and classes
- [x] **RP-11**: Resource mode does not render dependency lines, hierarchy/cascade, task list editing, or task reorder behavior

## Future Requirements

Deferred to future release.

### Multiple Zoom Levels
- **ZOOM-01**: Day view (each column = 1 day)
- **ZOOM-02**: Week view (each column = 1 week)
- **ZOOM-03**: Year view (each column = 1 month)

### Advanced Editing
- **EDIT-01**: Inline task editing directly on timeline
- **EDIT-02**: Multi-select tasks for bulk operations
- **EDIT-03**: Copy/paste tasks
- **EDIT-04**: Undo/redo support

## Out of Scope

| Feature | Reason |
|---------|--------|
| Critical path calculation | Complex algorithms, not core to scheduling visualization |
| Resource management | Separate concern, requires resource allocation logic |
| Export to PDF/PNG | Browser print sufficient, adds heavy dependencies |
| Built-in state management | Controlled component pattern preferred |
| Real-time collaboration | App layer concern, requires WebSocket/CRDT |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAL-01 | Phase 21 | Complete |
| CAL-02 | Phase 21 | Complete |
| CAL-03 | Phase 21 | Complete |
| CAL-04 | Phase 21 | Complete |
| CAL-05 | Phase 21 | Complete |
| COL-01 | Phase 22 | Complete |
| COL-02 | Phase 22 | Complete |
| COL-03 | Phase 22 | Complete |
| COL-04 | Phase 22 | Complete |
| COL-05 | Phase 22 | Complete |
| COL-06 | Phase 22 | Complete |
| COL-07 | Phase 22 | Complete |
| COL-08 | Phase 22 | Complete |
| MIG-01 | Phase 26 | Complete |
| MIG-02 | Phase 26 | Complete |
| MIG-03 | Phase 26 | Complete |
| MIG-04 | Phase 26 | Complete |
| MIG-05 | Phase 26 | Complete |
| MIG-06 | Phase 26 | Complete |
| MIG-07 | Phase 26 | Complete |
| RP-01 | Phase 30 | Complete |
| RP-02 | Phase 30 | Complete |
| RP-03 | Phase 30 | Complete |
| RP-04 | Phase 30 | Complete |
| RP-05 | Phase 30 | Complete |
| RP-06 | Phase 30 | Complete |
| RP-07 | Phase 30 | Complete |
| RP-08 | Phase 30 | Complete |
| RP-09 | Phase 30 | Complete |
| RP-10 | Phase 30 | Complete |
| RP-11 | Phase 30 | Complete |

**Coverage:**
- v0.50.0 requirements: 20 total
- Resource planner requirements: 11 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-04-25 after Phase 30 completion*
