# gantt-lib

Лёгкий React/Next.js компонент диаграммы Ганта с drag-and-drop. Перемещайте и изменяйте размер задач прямо на сетке.

## Установка

### NPM (рекомендуется)

```bash
npm install gantt-lib
```

### Разработка/Contributing

```bash
git clone https://github.com/simon100500/gantt-lib.git
cd gantt-lib
npm i
npm run dev
```

После запуска откройте [http://localhost:3000](http://localhost:3000) в браузере.

![Скриншот](packages/website/public/screen.png)

## Возможности

- Месячная сетка с заголовками дней
- Полосы задач, позиционируемые по датам начала/окончания, с настраиваемыми цветами
- Перетаскивание для перемещения и изменения размера задач (левый/правый край)
- Индикатор сегодняшнего дня (вертикальная красная линия)
- 60fps при 100+ задачах
- CSS-переменные для кастомизации
- TypeScript-first

## Быстрый старт

```tsx
import { GanttChart, type Task } from 'gantt-lib';
import 'gantt-lib/styles.css';

const tasks: Task[] = [
  {
    id: '1',
    name: 'Планирование спринта',
    startDate: '2026-02-01',
    endDate: '2026-02-07',
    color: '#3b82f6',
  },
  {
    id: '2',
    name: 'Разработка',
    startDate: '2026-02-08',
    endDate: '2026-02-20',
  },
];

export default function App() {
  const [tasks, setTasks] = useState(initialTasks);

  return (
    <GanttChart
      tasks={tasks}
      month={new Date('2026-02-01')}
      dayWidth={40}
      rowHeight={40}
      onChange={setTasks}
    />
  );
}
```

## Пропсы GanttChart

| Проп           | Тип                                                     | По умолчанию    | Описание                                      |
| -------------- | ------------------------------------------------------- | --------------- | --------------------------------------------- |
| `tasks`        | `Task[]`                                                | обязательный    | Массив задач для отображения                  |
| `month`        | `Date \| string`                                        | текущий месяц   | Отображаемый месяц                            |
| `dayWidth`     | `number`                                                | `40`            | Ширина столбца в пикселях                     |
| `rowHeight`    | `number`                                                | `40`            | Высота строки в пикселях                      |
| `headerHeight` | `number`                                                | `40`            | Высота заголовка в пикселях                   |
| `onChange`     | `(tasks: Task[] \| ((prev: Task[]) => Task[])) => void` | —               | Вызывается после завершения перетаскивания    |

## Интерфейс Task

```typescript
interface Task {
  id: string;               // Уникальный идентификатор
  name: string;             // Название, отображаемое на полосе
  startDate: string | Date; // ISO-строка или Date (UTC)
  endDate: string | Date;   // ISO-строка или Date (UTC)
  color?: string;           // Необязательный цвет, например '#3b82f6'
}
```

Даты могут быть ISO-строками (`'2026-02-01'`) или объектами `Date`. Все вычисления дат выполняются в UTC.

## Взаимодействие при перетаскивании

| Действие               | Как выполнить                         |
| ---------------------- | ------------------------------------- |
| Переместить задачу     | Перетащить за центр полосы            |
| Изменить размер слева  | Перетащить левый край (зона 12px)     |
| Изменить размер справа | Перетащить правый край (зона 12px)    |

Задачи привязываются к границам дней. Во время перетаскивания отображается тултип с датами.

## Кастомизация

Переопределите CSS-переменные в вашем глобальном стилевом файле:

```css
:root {
  /* Сетка */
  --gantt-grid-line-color: #e0e0e0;
  --gantt-cell-background: #ffffff;
  --gantt-row-hover-background: #f8f9fa;

  /* Размеры */
  --gantt-row-height: 40px;
  --gantt-header-height: 40px;
  --gantt-day-width: 40px;

  /* Полосы задач */
  --gantt-task-bar-default-color: #3b82f6;
  --gantt-task-bar-text-color: #ffffff;
  --gantt-task-bar-border-radius: 4px;
  --gantt-task-bar-height: 28px;

  /* Индикатор сегодня */
  --gantt-today-indicator-color: #ef4444;
  --gantt-today-indicator-width: 2px;
}
```

## Разработка

Этот проект использует Turborepo для управления монорепо.

```bash
npm install
npm run dev      # Запустить dev-сервер (website package)
npm run build    # Собрать все пакеты
npm run test     # Запустить unit-тесты (gantt-lib package)
npm run lint     # ESLint для всех пакетов
```

### Структура монорепо

```
packages/
  gantt-lib/    # Библиотека компонентов (npm package)
  website/      # Demo-сайт на Next.js
```

## Стек

- **React** 19 + **Next.js** 15
- **TypeScript** 5 (strict)
- **date-fns** 4 — форматирование дат
- **CSS Modules** — изолированные стили
- **Vitest** + React Testing Library — тесты

## Архитектурные заметки

**Производительность:** `TaskRow` обёрнут в `React.memo` с кастомным компаратором, который исключает `onChange`. При перетаскивании перерисовывается только перетаскиваемая строка — остальные не трогаются. Обновления позиции используют рефы + `requestAnimationFrame`, чтобы не нагружать React state на каждый кадр.

**Паттерн состояния:** `onChange` принимает как новый массив задач, так и функциональный апдейтер `(prev) => next`. Это предотвращает баги с устаревшим замыканием при нескольких быстрых перетаскиваниях подряд.

**Даты:** Все внутренние вычисления дат выполняются в UTC, чтобы избежать смещений из-за перехода на летнее время. Для надёжности передавайте даты как ISO-строки (`'2026-02-01'`).
