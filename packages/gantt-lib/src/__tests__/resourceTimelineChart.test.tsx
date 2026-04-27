import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ResourceTimelineChart } from '../components/ResourceTimelineChart';
import type { ResourceTimelineResource } from '../types';

const resources: ResourceTimelineResource[] = [
  {
    id: 'design',
    name: 'Design',
    items: [
      {
        id: 'discovery',
        resourceId: 'design',
        title: 'Discovery',
        subtitle: 'Client work',
        startDate: '2026-04-03',
        endDate: '2026-04-05',
        color: '#2563eb',
      },
    ],
  },
  {
    id: 'qa',
    name: 'QA',
    items: [],
  },
];

describe('ResourceTimelineChart', () => {
  it('renders resource headers from resource names', () => {
    render(<ResourceTimelineChart mode="resource-planner" resources={resources} />);

    expect(screen.getByDisplayValue('Design')).toBeInTheDocument();
    expect(screen.getByDisplayValue('QA')).toBeInTheDocument();
  });

  it('renders resource tasklist columns with type icon, availability, and worked-day count', () => {
    const typedResources: ResourceTimelineResource[] = [
      {
        id: 'crew',
        name: 'Бригада 100 общ',
        type: 'Люди',
        scope: 'Shared',
        items: [
          { id: 'a', resourceId: 'crew', title: 'A', startDate: '2026-04-01', endDate: '2026-04-02' },
        ],
      },
      {
        id: 'materials',
        name: 'Шум',
        type: 'Материалы',
        scope: 'Project',
        items: [],
      },
    ];

    render(<ResourceTimelineChart mode="resource-planner" resources={typedResources} />);

    expect(screen.getByText('Название')).toBeInTheDocument();
    expect(screen.queryByText('Тип')).toBeNull();
    expect(screen.queryByText('Доступность')).toBeNull();
    expect(screen.getByLabelText('Доступность')).toBeInTheDocument();
    expect(screen.getByText('Назначения')).toBeInTheDocument();
    expect(screen.getByLabelText('Тип ресурса Бригада 100 общ: Люди')).toHaveAttribute('title', 'Люди');
    expect(screen.getByLabelText('Тип ресурса Шум: Материалы')).toHaveAttribute('title', 'Материалы');
    expect(screen.getByLabelText('Доступность ресурса Бригада 100 общ')).toHaveTextContent('Общий');
    expect(screen.getByLabelText('Доступность ресурса Шум')).toHaveTextContent('Проект');
    expect(screen.getByLabelText('Назначения ресурса Бригада 100 общ: 1, 2 дн.')).toBeInTheDocument();
    expect(screen.getByLabelText('Назначения ресурса Шум: 0, 0 дн.')).toBeInTheDocument();
  });

  it('edits resource name, type, and availability inline', () => {
    const onResourceChange = vi.fn();
    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        onResourceChange={onResourceChange}
      />
    );

    const nameInput = screen.getByLabelText('Название ресурса Design');
    fireEvent.change(nameInput, { target: { value: 'UX Team' } });
    fireEvent.blur(nameInput);

    expect(onResourceChange).toHaveBeenCalledWith(expect.objectContaining({
      id: 'design',
      name: 'UX Team',
    }));

    const typeChip = screen.getByLabelText('Тип ресурса Design: Другое');
    fireEvent.click(typeChip);
    fireEvent.click(screen.getByRole('button', { name: 'Оборудование' }));
    expect(onResourceChange).toHaveBeenCalledWith(expect.objectContaining({
      id: 'design',
      type: 'Оборудование',
    }));

    const scopeChip = screen.getByLabelText('Доступность ресурса Design');
    fireEvent.click(scopeChip);
    fireEvent.click(screen.getByRole('button', { name: 'Общий' }));
    expect(onResourceChange).toHaveBeenCalledWith(expect.objectContaining({
      id: 'design',
      scope: 'Shared',
    }));
  });

  it('renders an add-resource row only when onAddResource is provided', () => {
    const { container, rerender } = render(<ResourceTimelineChart mode="resource-planner" resources={resources} />);

    expect(screen.queryByText('+ Добавить ресурс')).toBeNull();
    expect(container.querySelector('[data-resource-add-row="true"]')).toBeNull();

    rerender(<ResourceTimelineChart mode="resource-planner" resources={resources} onAddResource={vi.fn()} />);

    expect(screen.getByText('+ Добавить ресурс')).toBeInTheDocument();
    expect(container.querySelector('[data-resource-add-row="true"]')).toBeTruthy();
  });

  it('confirms a new resource name from the add-resource row', () => {
    const onAddResource = vi.fn();
    render(<ResourceTimelineChart mode="resource-planner" resources={resources} onAddResource={onAddResource} />);

    fireEvent.click(screen.getByText('+ Добавить ресурс'));
    const input = screen.getByPlaceholderText('Название ресурса');
    fireEvent.change(input, { target: { value: 'Install Crew' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onAddResource).toHaveBeenCalledTimes(1);
    expect(onAddResource).toHaveBeenCalledWith({
      id: expect.any(String),
      name: 'Install Crew',
      type: 'Другое',
      scope: 'Project',
      items: [],
    });
    expect(screen.getByText('+ Добавить ресурс')).toBeInTheDocument();
  });

  it('renders resource row action commands in a three-dots menu', () => {
    const onSelect = vi.fn();
    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        resourceMenuCommands={[
          {
            id: 'rename',
            label: 'Переименовать',
            onSelect,
          },
          {
            id: 'hidden',
            label: 'Скрытая команда',
            isVisible: () => false,
            onSelect: vi.fn(),
          },
        ]}
      />
    );

    fireEvent.click(screen.getAllByLabelText('Действия ресурса')[0]);
    fireEvent.click(screen.getByText('Переименовать'));

    expect(screen.queryByText('Скрытая команда')).toBeNull();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'design', name: 'Design' }));
  });

  it('disables resource row action commands when isDisabled returns true', () => {
    const onSelect = vi.fn();
    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        resourceMenuCommands={[
          {
            id: 'delete',
            label: 'Удалить',
            isDisabled: () => true,
            onSelect,
          },
        ]}
      />
    );

    fireEvent.click(screen.getAllByLabelText('Действия ресурса')[0]);
    const command = screen.getByText('Удалить');

    expect(command).toBeDisabled();
    fireEvent.click(command);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('applies containerHeight to the scroll container', () => {
    const { container } = render(
      <ResourceTimelineChart mode="resource-planner" resources={resources} containerHeight="calc(100dvh - 132px)" />
    );

    const scrollContainer = container.querySelector('.gantt-resourceTimeline-scrollContainer') as HTMLElement;
    expect(scrollContainer.style.height).toBe('calc(100dvh - 132px)');
    expect(scrollContainer.style.overflowY).toBe('auto');
  });

  it('keeps the sticky resource column above timeline overlays', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/components/ResourceTimelineChart/ResourceTimelineChart.css'),
      'utf8'
    );

    expect(css).toMatch(/\.gantt-resourceTimeline-resourceColumn\s*{[^}]*z-index:\s*3;/);
    expect(css).toMatch(/\.gantt-resourceTimeline-chartSurface\s*{[^}]*position:\s*relative;[^}]*z-index:\s*0;/);
    expect(css).toMatch(/\.gantt-resourceTimeline \.gantt-ti-indicator\s*{[^}]*z-index:\s*4;/);
    expect(css).not.toMatch(/\.gantt-resourceTimeline-item:hover,\s*\.gantt-resourceTimeline-item:focus-visible\s*{[^}]*z-index:/);
  });

  it('renders default item bars with demo-style duration, title, and subtitle', () => {
    const { container } = render(<ResourceTimelineChart mode="resource-planner" resources={resources} />);

    expect(screen.getByLabelText('1 д')).toHaveTextContent('1');
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Client work')).toBeInTheDocument();
    expect(screen.queryByText('3–5 апр')).toBeNull();
    expect(container.querySelector('[data-resource-item-id="discovery"]')).not.toHaveAttribute('title');
    expect(container.querySelector('[data-resource-item-id="discovery"]')).toHaveAttribute('data-resource-item-tooltip', 'Discovery');
  });

  it('calls onResourceItemClick from mouse and keyboard activation', () => {
    const onResourceItemClick = vi.fn();
    const { container } = render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        onResourceItemClick={onResourceItemClick}
      />
    );

    const item = container.querySelector('[data-resource-item-id="discovery"]') as HTMLElement;
    fireEvent.click(item);
    fireEvent.keyDown(item, { key: 'Enter' });
    fireEvent.keyDown(item, { key: ' ' });

    expect(item).toHaveAttribute('role', 'button');
    expect(item).toHaveAttribute('tabindex', '0');
    expect(onResourceItemClick).toHaveBeenCalledTimes(3);
    expect(onResourceItemClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'discovery' }));
  });

  it('renders a resource item menu button and keeps its active state controlled', () => {
    const onResourceItemClick = vi.fn();
    const onResourceItemMenuClick = vi.fn();
    const { container } = render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        onResourceItemClick={onResourceItemClick}
        onResourceItemMenuClick={onResourceItemMenuClick}
        activeResourceItemId="discovery"
      />
    );

    const item = container.querySelector('[data-resource-item-id="discovery"]') as HTMLElement;
    const menuButton = screen.getByLabelText('Действия назначения');
    fireEvent.mouseDown(menuButton);
    fireEvent.click(menuButton);

    expect(item).toHaveClass('gantt-resourceTimeline-itemHasMenu');
    expect(item).toHaveClass('gantt-resourceTimeline-itemActive');
    expect(onResourceItemMenuClick).toHaveBeenCalledTimes(1);
    expect(onResourceItemMenuClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'discovery' }));
    expect(onResourceItemClick).not.toHaveBeenCalled();
  });

  it('renders resource item bars with fixed visual spacing inside lanes', () => {
    const { container } = render(
      <ResourceTimelineChart mode="resource-planner" resources={resources} dayWidth={40} laneHeight={40} />
    );

    const item = container.querySelector('[data-resource-item-id="discovery"]') as HTMLElement;
    expect(item.style.left).toBe('82px');
    expect(item.style.top).toBe('2px');
    expect(item.style.width).toBe('117px');
    expect(item.style.height).toBe('36px');
  });

  it('keeps empty resources visible with one-lane height', () => {
    const { container } = render(<ResourceTimelineChart mode="resource-planner" resources={resources} laneHeight={36} />);

    const qaRow = container.querySelector('[data-resource-row-id="qa"]') as HTMLElement;
    expect(qaRow).toBeTruthy();
    expect(qaRow.style.height).toBe('44px');
  });

  it('grows resource row height when items overlap into multiple lanes', () => {
    const overlapping: ResourceTimelineResource[] = [
      {
        id: 'dev',
        name: 'Development',
        items: [
          { id: 'a', resourceId: 'dev', title: 'A', startDate: '2026-04-01', endDate: '2026-04-03' },
          { id: 'b', resourceId: 'dev', title: 'B', startDate: '2026-04-03', endDate: '2026-04-06' },
        ],
      },
    ];

    const { container } = render(
      <ResourceTimelineChart mode="resource-planner" resources={overlapping} laneHeight={34} />
    );

    const devRow = container.querySelector('[data-resource-row-id="dev"]') as HTMLElement;
    expect(devRow.style.height).toBe('76px');
  });

  it('highlights concrete overlap ranges for conflicting resource items', () => {
    const overlapping: ResourceTimelineResource[] = [
      {
        id: 'dev',
        name: 'Development',
        items: [
          { id: 'a', resourceId: 'dev', title: 'A', startDate: '2026-04-01', endDate: '2026-04-04' },
          { id: 'b', resourceId: 'dev', title: 'B', startDate: '2026-04-03', endDate: '2026-04-06' },
        ],
      },
    ];

    const { container } = render(
      <ResourceTimelineChart mode="resource-planner" resources={overlapping} dayWidth={40} businessDays={false} />
    );

    const conflictBadge = screen.getByLabelText('1 наложение');
    expect(conflictBadge).toHaveTextContent('1');
    expect(conflictBadge).toHaveAttribute('title', '1 наложение');
    const firstItem = container.querySelector('[data-resource-item-id="a"]') as HTMLElement;
    const secondItem = container.querySelector('[data-resource-item-id="b"]') as HTMLElement;

    const firstOverlay = firstItem.querySelector('[data-resource-conflict-overlay="true"]') as HTMLElement;
    const secondOverlay = secondItem.querySelector('[data-resource-conflict-overlay="true"]') as HTMLElement;
    expect(firstOverlay.style.left).toBe('80px');
    expect(firstOverlay.style.width).toBe('77px');
    expect(secondOverlay.style.left).toBe('0px');
    expect(secondOverlay.style.width).toBe('80px');
  });

  it('scrolls through resource conflicts when clicking the conflict badge', () => {
    const overlapping: ResourceTimelineResource[] = [
      {
        id: 'dev',
        name: 'Development',
        items: [
          { id: 'a', resourceId: 'dev', title: 'A', startDate: '2026-04-05', endDate: '2026-04-08' },
          { id: 'b', resourceId: 'dev', title: 'B', startDate: '2026-04-06', endDate: '2026-04-09' },
          { id: 'c', resourceId: 'dev', title: 'C', startDate: '2026-04-15', endDate: '2026-04-18' },
          { id: 'd', resourceId: 'dev', title: 'D', startDate: '2026-04-16', endDate: '2026-04-19' },
        ],
      },
    ];

    const { container } = render(
      <ResourceTimelineChart mode="resource-planner" resources={overlapping} dayWidth={40} businessDays={false} />
    );
    const scrollContainer = container.querySelector('.gantt-resourceTimeline-scrollContainer') as HTMLElement;
    const scrollTo = vi.fn();
    scrollContainer.scrollTo = scrollTo;

    const conflictBadge = screen.getByLabelText('2 наложения');
    fireEvent.click(conflictBadge);

    expect(scrollTo).toHaveBeenNthCalledWith(1, { left: 80, top: 0, behavior: 'smooth' });
    expect(container.querySelector('[data-resource-item-id="a"]')).toHaveClass('gantt-resourceTimeline-itemConflictActive');

    fireEvent.click(conflictBadge);

    expect(scrollTo).toHaveBeenNthCalledWith(2, { left: 480, top: 0, behavior: 'smooth' });
    expect(container.querySelector('[data-resource-item-id="c"]')).toHaveClass('gantt-resourceTimeline-itemConflictActive');
  });

  it('keeps adjacent same-lane resource bars separated when another item overlaps both', () => {
    const staggeredOverlap: ResourceTimelineResource[] = [
      {
        id: 'dev',
        name: 'Development',
        items: [
          { id: 'a', resourceId: 'dev', title: 'A', startDate: '2026-04-01', endDate: '2026-04-02' },
          { id: 'b', resourceId: 'dev', title: 'B', startDate: '2026-04-03', endDate: '2026-04-04' },
          { id: 'c', resourceId: 'dev', title: 'C', startDate: '2026-04-01', endDate: '2026-04-04' },
        ],
      },
    ];

    const { container } = render(
      <ResourceTimelineChart mode="resource-planner" resources={staggeredOverlap} dayWidth={40} businessDays={false} />
    );

    const firstItem = container.querySelector('[data-resource-item-id="a"]') as HTMLElement;
    const secondItem = container.querySelector('[data-resource-item-id="b"]') as HTMLElement;
    const firstRight = parseInt(firstItem.style.left, 10) + parseInt(firstItem.style.width, 10);
    const secondLeft = parseInt(secondItem.style.left, 10);
    const firstOverlay = firstItem.querySelector('[data-resource-conflict-overlay="true"]') as HTMLElement;

    expect(firstItem.style.top).toBe(secondItem.style.top);
    expect(secondLeft - firstRight).toBe(3);
    expect(parseInt(firstOverlay.style.left, 10) + parseInt(firstOverlay.style.width, 10)).toBeLessThanOrEqual(
      parseInt(firstItem.style.width, 10)
    );
  });

  it('keeps a two-pixel vertical gap between bars in adjacent lanes inside one resource row', () => {
    const overlapping: ResourceTimelineResource[] = [
      {
        id: 'dev',
        name: 'Development',
        items: [
          { id: 'a', resourceId: 'dev', title: 'A', startDate: '2026-04-01', endDate: '2026-04-03' },
          { id: 'b', resourceId: 'dev', title: 'B', startDate: '2026-04-03', endDate: '2026-04-06' },
        ],
      },
    ];

    const { container } = render(
      <ResourceTimelineChart mode="resource-planner" resources={overlapping} laneHeight={40} />
    );

    const firstItem = container.querySelector('[data-resource-item-id="a"]') as HTMLElement;
    const secondItem = container.querySelector('[data-resource-item-id="b"]') as HTMLElement;
    expect(firstItem.style.top).toBe('2px');
    expect(firstItem.style.height).toBe('37px');
    expect(secondItem.style.top).toBe('41px');
    expect(secondItem.style.height).toBe('37px');
  });

  it('keeps an eight-pixel vertical gap after each resource row before the separator', () => {
    const rowGapResources: ResourceTimelineResource[] = [
      {
        id: 'crew-a',
        name: 'Crew A',
        items: [
          { id: 'a', resourceId: 'crew-a', title: 'A', startDate: '2026-04-01', endDate: '2026-04-03' },
        ],
      },
      {
        id: 'crew-b',
        name: 'Crew B',
        items: [
          { id: 'b', resourceId: 'crew-b', title: 'B', startDate: '2026-04-01', endDate: '2026-04-03' },
        ],
      },
    ];

    const { container } = render(
      <ResourceTimelineChart mode="resource-planner" resources={rowGapResources} laneHeight={40} />
    );

    const firstRow = container.querySelector('.gantt-resourceTimeline-row[data-resource-row-id="crew-a"]') as HTMLElement;
    const secondRow = container.querySelector('.gantt-resourceTimeline-row[data-resource-row-id="crew-b"]') as HTMLElement;
    const firstHeader = container.querySelector('.gantt-resourceTimeline-resourceHeader[data-resource-row-id="crew-a"]') as HTMLElement;
    const firstItem = container.querySelector('[data-resource-item-id="a"]') as HTMLElement;
    const secondItem = container.querySelector('[data-resource-item-id="b"]') as HTMLElement;

    expect(firstRow.style.top).toBe('0px');
    expect(firstRow.style.height).toBe('48px');
    expect(secondRow.style.top).toBe('48px');
    expect(firstHeader.style.height).toBe('48px');
    expect(firstHeader.style.paddingBottom).toBe('8px');
    expect(firstItem.style.top).toBe('2px');
    expect(secondItem.style.top).toBe('50px');
  });

  it('allows custom item content and appends per-item classes', () => {
    const { container } = render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        renderItem={(item) => <strong>Custom {item.title}</strong>}
        getItemClassName={(item) => `custom-${item.id}`}
      />
    );

    expect(screen.getByText('Custom Discovery')).toBeInTheDocument();
    expect(screen.queryByText('Client work')).toBeNull();
    expect(container.querySelector('.gantt-resourceTimeline-item.custom-discovery')).toBeTruthy();
  });

  it('renders only full months that contain resource work and aligns header/body separators', () => {
    const multiMonthResources: ResourceTimelineResource[] = [
      {
        id: 'design',
        name: 'Design',
        items: [
          { id: 'march', resourceId: 'design', title: 'March', startDate: '2026-03-30', endDate: '2026-04-02' },
          { id: 'april', resourceId: 'design', title: 'April', startDate: '2026-04-10', endDate: '2026-04-12' },
        ],
      },
    ];

    const { container } = render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={multiMonthResources}
        dayWidth={10}
      />
    );

    const grid = container.querySelector('.gantt-resourceTimeline-grid') as HTMLElement;
    const stickyHeader = container.querySelector('.gantt-resourceTimeline-stickyHeader') as HTMLElement;
    const monthCells = Array.from(container.querySelectorAll('.gantt-tsh-monthCell')) as HTMLElement[];
    const headerSeparators = Array.from(container.querySelectorAll('.gantt-tsh-separator')) as HTMLElement[];
    const gridMonthSeparators = Array.from(container.querySelectorAll('.gantt-gb-monthSeparator')) as HTMLElement[];

    expect(grid.style.width).toBe('1220px');
    expect(stickyHeader.style.width).toBe('1220px');
    expect(monthCells.map((cell) => cell.style.width)).toEqual(['310px', '300px', '310px', '300px']);
    expect(headerSeparators.map((separator) => separator.style.left)).toEqual(['310px', '610px', '920px']);
    expect(gridMonthSeparators.map((separator) => separator.style.left)).toEqual(['310px', '610px', '920px']);
  });

  it('passes viewMode through the shared time scale in resource mode', () => {
    const { container, rerender } = render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        dayWidth={10}
        viewMode="week"
      />
    );

    expect(container.querySelectorAll('.gantt-tsh-weekCell').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.gantt-gb-weekSeparator').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.gantt-gb-dayLine')).toHaveLength(0);

    rerender(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        dayWidth={10}
        viewMode="month"
      />
    );

    expect(container.querySelectorAll('.gantt-tsh-monthCell').length).toBeGreaterThan(0);
    expect(
      container.querySelectorAll('.gantt-gb-monthSeparator, .gantt-gb-weekSeparator').length
    ).toBeGreaterThan(0);
    expect(container.querySelectorAll('.gantt-gb-dayLine')).toHaveLength(0);
  });

  it('pans the resource timeline when dragging empty grid space', () => {
    const { container } = render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        dayWidth={40}
      />
    );

    const scrollContainer = container.querySelector('.gantt-resourceTimeline-scrollContainer') as HTMLElement;
    const grid = container.querySelector('.gantt-resourceTimeline-grid') as HTMLElement;
    scrollContainer.scrollLeft = 120;
    scrollContainer.scrollTop = 30;

    fireEvent.mouseDown(grid, { clientX: 200, clientY: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 150, clientY: 80 });

    expect(scrollContainer.scrollLeft).toBe(170);
    expect(scrollContainer.scrollTop).toBe(30);
    expect(scrollContainer.style.cursor).toBe('grabbing');

    fireEvent.mouseUp(window);
    expect(scrollContainer.style.cursor).toBe('');
  });

  it('can opt into vertical panning when allowVerticalPan is enabled', () => {
    const { container } = render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        dayWidth={40}
        allowVerticalPan
      />
    );

    const scrollContainer = container.querySelector('.gantt-resourceTimeline-scrollContainer') as HTMLElement;
    const grid = container.querySelector('.gantt-resourceTimeline-grid') as HTMLElement;
    scrollContainer.scrollLeft = 120;
    scrollContainer.scrollTop = 30;

    fireEvent.mouseDown(grid, { clientX: 200, clientY: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 150, clientY: 80 });

    expect(scrollContainer.scrollLeft).toBe(170);
    expect(scrollContainer.scrollTop).toBe(50);
  });

  it('renders light weekend overlays on resource items in business-days mode', () => {
    const weekendResources: ResourceTimelineResource[] = [
      {
        id: 'design',
        name: 'Design',
        items: [
          {
            id: 'weekend-span',
            resourceId: 'design',
            title: 'Weekend span',
            startDate: '2026-04-03',
            endDate: '2026-04-06',
          },
        ],
      },
    ];

    const { container } = render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={weekendResources}
        dayWidth={40}
        businessDays
      />
    );

    const overlays = Array.from(container.querySelectorAll('[data-resource-weekend-overlay="true"]')) as HTMLElement[];
    expect(overlays).toHaveLength(1);
    expect(overlays[0].style.left).toBe('40px');
    expect(overlays[0].style.width).toBe('80px');
  });

  it('does not render weekend overlays when business-days mode is disabled', () => {
    const { container } = render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        businessDays={false}
      />
    );

    expect(container.querySelector('[data-resource-weekend-overlay="true"]')).toBeNull();
  });
});
