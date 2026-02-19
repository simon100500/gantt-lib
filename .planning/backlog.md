Исправить календарную сетку: 
- она не рисуется на весь проект при перетягивании полос
- столбцы в заголовке разной ширины
- сделать трёхуровненвый заголовок: год, месяц, день

Увеличить ручки для растягивания полос: и визуально и зоны
Даты начала и окончания показывать слева и справа от полоски
Процент выполнения закрашивать



### Phase 3: Polish & Developer Experience
**Goal**: Production-ready library with excellent TypeScript support and distribution
**Depends on**: Phase 2
**Requirements**: API-03, DX-01, DX-02, DX-03, DX-04
**Success Criteria** (what must be TRUE):
  1. Developer gets full TypeScript support with exported types
  2. Developer can install component with minimal dependencies
  3. Bundle size is under 15KB gzipped
  4. Component works as Next.js App Router client component
  5. Developer can customize colors via CSS variables
  6. API surface is simple: `<Gantt tasks={tasks} onChange={handleTasksChange} />`
**Plans**: TBD

Plans:
- [ ] 03-01: TypeScript types and API surface
- [ ] 03-02: CSS theming with CSS variables
- [ ] 03-03: Bundle optimization and distribution setup
- [ ] 03-04: Next.js App Router compatibility verification