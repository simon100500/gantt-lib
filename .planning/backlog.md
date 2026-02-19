Доработать календарную сетку: 
- рисовать сетку на весь проект при перетягивании полос (сейчас нет)
- столбцы в заголовке делать одной ширины
- сделать трёхуровненвый заголовок: год, месяц, день
- добавить бледные вертикальные линии в календарную сетку
- добавить яркие разделители месяцев и чуть менее яркие - недель
- закрашивать бледно-розовым выходные дни: в шапке и в календарной сетке

Доработать полосы
<!-- Увеличить ручки для растягивания полос: и визуально и зоны -->
<!-- Убрать hover -->
Даты начала и окончания показывать слева и справа от полосы
Добавить процент выполнения и закрашивать его (без возможности изменять прогресс передвижением границы)
Убрать всплывающее окошко при перетягивании полосы
Менять даты в подписях моментально при перетягивании
Показывать вертикальные линии на всю высоту календарной сетки при действиях с полосой: при перемещении линии и от начала и от конца полосы, при растягивании — линия на растягиваемом конце. Это нужно для того чтобы ориентироваться относительно других полос.

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