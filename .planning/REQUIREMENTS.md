# Requirements: Gantt Chart Library for Next.js

**Defined:** 2026-03-17
**Core Value:** Drag-and-drop task scheduling with Excel-like visual simplicity

## v0.50.0 Requirements

Requirements for adding extensibility features — custom weekend calendar and additional TaskList columns.

### Custom Weekend Calendar

- [x] **CAL-01**: User can pass `weekends?: Date[]` prop to GanttChart for custom weekend dates
- [x] **CAL-02**: User can pass `isWeekend?: (date: Date) => boolean` prop to GanttChart for flexible weekend logic
- [ ] **CAL-03**: Component highlights custom weekend dates with red background in GridBackground
- [x] **CAL-04**: Both props work together — isWeekend takes precedence if both provided
- [x] **CAL-05**: Default behavior (Saturday/Sunday) remains if no props passed

### Additional TaskList Columns

- [ ] **COL-01**: User can pass `additionalColumns?: Column[]` prop to TaskList
- [ ] **COL-02**: Column interface includes `id`, `header`, `renderCell`, optional `editor`, `width`, `after`
- [ ] **COL-03**: `renderCell: (row: GanttRow) => ReactNode` renders cell content for each row
- [ ] **COL-04**: `editor?: (row: GanttRow) => ReactNode` provides inline editor component
- [ ] **COL-05**: `after?: string` positions column after specified base column (default: after 'Name')
- [ ] **COL-06**: Base columns remain: №, Name, Dates, Dependencies, Actions
- [ ] **COL-07**: Additional columns render inline, scroll with TaskList
- [ ] **COL-08**: Column width is customizable via `width?: string | number`

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
| CAL-03 | Phase 21 | Pending |
| CAL-04 | Phase 21 | Complete |
| CAL-05 | Phase 21 | Complete |
| COL-01 | Phase 22 | Pending |
| COL-02 | Phase 22 | Pending |
| COL-03 | Phase 22 | Pending |
| COL-04 | Phase 22 | Pending |
| COL-05 | Phase 22 | Pending |
| COL-06 | Phase 22 | Pending |
| COL-07 | Phase 22 | Pending |
| COL-08 | Phase 22 | Pending |

**Coverage:**
- v0.50.0 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after initial definition*
