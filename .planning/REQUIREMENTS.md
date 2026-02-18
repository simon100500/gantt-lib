# Requirements: Gantt Chart Library for Next.js

**Defined:** 2026-02-18
**Core Value:** Drag-and-drop task scheduling with Excel-like visual simplicity

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Core Rendering

- [ ] **REND-01**: Display monthly calendar grid with date headers
- [ ] **REND-02**: Render task bars positioned by start/end dates on timeline
- [ ] **REND-03**: Show task names on or within task bars
- [ ] **REND-04**: Display vertical indicator line for current date (today)
- [ ] **REND-05**: Excel-like table styling with grid lines and cell-based appearance

### Interactions

- [x] **INT-01**: User can drag task bars horizontally to change start/end dates (move)
- [x] **INT-02**: User can drag task bar edges to change duration (resize)
- [ ] **INT-03**: Component maintains 60fps performance during drag operations (~100 tasks)
- [x] **INT-04**: Parent component receives callback with updated task data after drag operation

### Data & API

- [ ] **API-01**: Component accepts simple array: `{ id, name, startDate, endDate, color? }`
- [x] **API-02**: Component provides `onChange` callback returning modified tasks array
- [ ] **API-03**: Simple API surface: `<Gantt tasks={tasks} onChange={handleTasksChange} />`
- [ ] **API-04**: All dates handled as UTC internally to prevent DST bugs

### Developer Experience

- [ ] **DX-01**: Full TypeScript support with exported types
- [ ] **DX-02**: Minimal dependencies (prefer zero deps, or lightweight libs)
- [ ] **DX-03**: Bundle size < 15KB gzipped
- [ ] **DX-04**: Compatible with Next.js App Router (client component)
- [ ] **DX-05**: CSS variables for theming (users can customize colors)

### Quality

- [ ] **QL-01**: React.memo on task components to prevent re-render storms
- [ ] **QL-02**: Proper cleanup of event listeners to prevent memory leaks
- [x] **QL-03**: Unit tests for core date utilities and geometry calculations

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Features

- **INT-05**: Task selection state (click to select, visual feedback)
- **REND-06**: Task list sidebar with synchronized scrolling
- **REND-07**: Multiple task color themes/presets
- **DX-06**: Virtualization for 1000+ tasks

### Accessibility

- **A11Y-01**: Keyboard navigation (arrow keys to move tasks)
- **A11Y-02**: ARIA labels for screen readers
- **A11Y-03**: Focus indicators for interactive elements

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Task dependencies | Adds massive complexity, conflicts with lightweight goal |
| Auto-scheduling | Requires constraint solver, unpredictable behavior |
| Multiple zoom levels | Month-only is requirement AND simplification advantage |
| Resource management | Separate concern, doubles complexity |
| Critical path calculation | External tools for PM pros, not this library |
| Export to PDF/PNG | Browser print sufficient, adds heavy deps |
| Progress tracking | Can add later, not core to scheduling |
| Inline editing | Modal/app layer simpler, focus on drag-drop |
| Undo/redo | Browser undo or app-level implementation |
| Real-time collaboration | App layer concern, requires WebSocket/CRDT |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REND-01 | Phase 1 | Pending |
| REND-02 | Phase 1 | Pending |
| REND-03 | Phase 1 | Pending |
| REND-04 | Phase 1 | Pending |
| REND-05 | Phase 1 | Pending |
| INT-01 | Phase 2 | Complete |
| INT-02 | Phase 2 | Complete |
| INT-03 | Phase 2 | Pending |
| INT-04 | Phase 2 | Complete |
| API-01 | Phase 1 | Pending |
| API-02 | Phase 2 | Complete |
| API-03 | Phase 3 | Pending |
| API-04 | Phase 1 | Pending |
| DX-01 | Phase 3 | Pending |
| DX-02 | Phase 3 | Pending |
| DX-03 | Phase 3 | Pending |
| DX-04 | Phase 3 | Pending |
| DX-05 | Phase 1 | Pending |
| QL-01 | Phase 2 | Pending |
| QL-02 | Phase 2 | Pending |
| QL-03 | Phase 1 | Completed |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 after roadmap creation*
