// START_MODULE_CONTRACT
// PURPOSE: Verify dependency rendering, isolation across mounted charts and hover marker ownership.
// INPUTS: Hidden and visible charts with the same linked tasks.
// OUTPUTS: Unique stable markers resolving inside each owning SVG, including hover and selected edges.
// END_MODULE_CONTRACT
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DependencyLines } from '../components/DependencyLines';
import type { Task } from '../components/GanttChart';
import { cascadeByLinks } from '../core/scheduling/cascade';

const isWeekend = (date: Date) => date.getUTCDay() === 0 || date.getUTCDay() === 6;

describe('DependencyLines', () => {
  it('keeps couplings visual-only even when ordinary dependency clicks are enabled', () => {
    const tasks: Task[] = [
      { id: 'a', name: 'A', startDate: '2026-03-01', endDate: '2026-03-01' },
      { id: 'b', name: 'B', startDate: '2026-03-02', endDate: '2026-03-02', dependencies: [{ taskId: 'a', type: 'FS', lag: 0 }] },
    ];
    const click = vi.fn();
    const { container } = render(<DependencyLines tasks={tasks} allTasks={tasks} activityEndpoints
      monthStart={new Date('2026-03-01T00:00:00Z')} dayWidth={24} rowHeight={24} rowTops={[0, 0]}
      gridWidth={1000} onDependencyClick={click} />);
    const coupling = container.querySelector('.gantt-dependency-coupling')!;
    expect(coupling).not.toBeNull();
    expect(container.querySelector('.gantt-dependency-coupling-hit-area')).toBeNull();
    expect(container.querySelector('[role="button"]')).toBeNull();
    fireEvent.pointerEnter(coupling.parentElement!);
    fireEvent.click(coupling);
    expect(container.querySelector('.gantt-dependency-line-hovered')).toBeNull();
    expect(click).not.toHaveBeenCalled();
  });

  it('does not mount hit paths or hover handlers for a static overlay', () => {
    const tasks: Task[] = [
      { id: 'a', name: 'A', startDate: '2026-03-01', endDate: '2026-03-01' },
      { id: 'b', name: 'B', startDate: '2026-03-03', endDate: '2026-03-03', dependencies: [{ taskId: 'a', type: 'FS', lag: 0 }] },
    ];
    const { container } = render(<DependencyLines tasks={tasks} monthStart={new Date('2026-03-01T00:00:00Z')}
      dayWidth={24} rowHeight={40} gridWidth={1000} />);
    expect(container.querySelector('.gantt-dependency-hit-area')).toBeNull();
    expect(container.querySelector('[role="button"]')).toBeNull();
    fireEvent.pointerEnter(container.querySelector('.gantt-dependency-line')!);
    expect(container.querySelector('.gantt-dependency-path')?.getAttribute('marker-end')).not.toContain('hover');
  });
  it('still cascades successors through a hidden dependency', () => {
    const tasks: Task[] = [
      { id: 'a', name: 'A', startDate: '2026-03-01', endDate: '2026-03-02' },
      { id: 'b', name: 'B', startDate: '2026-03-03', endDate: '2026-03-04', dependencies: [{ taskId: 'a', type: 'FS', lag: 0, hidden: true }] },
    ];
    const result = cascadeByLinks('a', new Date('2026-03-10T00:00:00Z'), new Date('2026-03-11T00:00:00Z'), tasks);
    expect(new Date(result.find(task => task.id === 'b')!.startDate).toISOString().slice(0, 10)).toBe('2026-03-12');
  });
  it('hides system arrows while retaining manual arrows and the full input graph', () => {
    const tasks: Task[] = [
      { id: 'system', name: 'System', startDate: '2026-03-01', endDate: '2026-03-02' },
      { id: 'manual', name: 'Manual', startDate: '2026-03-01', endDate: '2026-03-02' },
      { id: 'target', name: 'Target', startDate: '2026-03-03', endDate: '2026-03-04', dependencies: [
        { taskId: 'system', type: 'FS', lag: 9, hidden: true },
        { taskId: 'manual', type: 'SS', lag: 2 },
      ] },
    ];
    const { container } = render(<DependencyLines tasks={tasks} allTasks={tasks} monthStart={new Date('2026-03-01T00:00:00Z')} dayWidth={40} rowHeight={40} gridWidth={1240} />);
    expect(container.querySelectorAll('.gantt-dependency-path')).toHaveLength(1);
    expect(container.textContent).toContain('+2');
    expect(container.textContent).not.toContain('+9');
    expect(tasks[2].dependencies).toHaveLength(2);
  });
  it('draws a dashed link between children of two collapsed composite works', () => {
    const allTasks: Task[] = [
      { id: 'work-a', name: 'Work A', composite: true, startDate: '2026-03-01', endDate: '2026-03-04' },
      { id: 'floor-a', parentId: 'work-a', name: 'Floor A', startDate: '2026-03-02', endDate: '2026-03-03' },
      { id: 'work-b', name: 'Work B', composite: true, startDate: '2026-03-05', endDate: '2026-03-08' },
      { id: 'floor-b', parentId: 'work-b', name: 'Floor B', startDate: '2026-03-06', endDate: '2026-03-07', dependencies: [{ taskId: 'floor-a', type: 'FS', lag: 0 }] },
    ];
    const { container } = render(
      <DependencyLines
        tasks={[allTasks[0], allTasks[2]]}
        allTasks={allTasks}
        collapsedParentIds={new Set(['work-a', 'work-b'])}
        monthStart={new Date('2026-03-01T00:00:00.000Z')}
        dayWidth={40}
        rowHeight={40}
        gridWidth={1240}
      />
    );
    const path = container.querySelector('.gantt-dependency-virtual');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).not.toContain('NaN');
  });

  it('renders lag labels in business days when enabled', () => {
    const tasks: Task[] = [
      {
        id: 'pred',
        name: 'Pred',
        startDate: '2026-03-03',
        endDate: '2026-03-09',
        progress: 0,
      },
      {
        id: 'succ',
        name: 'Succ',
        startDate: '2026-03-12',
        endDate: '2026-03-18',
        progress: 0,
        dependencies: [{ taskId: 'pred', type: 'FF', lag: 7 }],
      },
    ];

    render(
      <DependencyLines
        tasks={tasks}
        allTasks={tasks}
        monthStart={new Date('2026-03-01T00:00:00.000Z')}
        dayWidth={40}
        rowHeight={40}
        gridWidth={1240}
        businessDays={true}
        weekendPredicate={isWeekend}
      />
    );

    expect(screen.getByText('+7')).toBeTruthy();
  });

  it('reports the exact dependency when its line is clicked', () => {
    const onDependencyClick = vi.fn();
    const tasks: Task[] = [
      { id: 'pred-task', name: 'Pred', startDate: '2026-03-03', endDate: '2026-03-04' },
      {
        id: 'succ-task',
        name: 'Succ',
        startDate: '2026-03-05',
        endDate: '2026-03-06',
        dependencies: [{ taskId: 'pred-task', type: 'FS', lag: 0 }],
      },
    ];

    const { container } = render(
      <DependencyLines
        tasks={tasks}
        allTasks={tasks}
        monthStart={new Date('2026-03-01T00:00:00.000Z')}
        dayWidth={40}
        rowHeight={40}
        gridWidth={1240}
        onDependencyClick={onDependencyClick}
      />
    );

    fireEvent.click(container.querySelector('.gantt-dependency-hit-area')!);

    expect(onDependencyClick).toHaveBeenCalledWith(expect.objectContaining({
      predecessorId: 'pred-task',
      successorId: 'succ-task',
      linkType: 'FS',
    }));
  });

  it('highlights the selected dependency without adding an outline', () => {
    const tasks: Task[] = [
      { id: 'pred-task', name: 'Pred', startDate: '2026-03-03', endDate: '2026-03-04' },
      {
        id: 'succ-task',
        name: 'Succ',
        startDate: '2026-03-05',
        endDate: '2026-03-06',
        dependencies: [{ taskId: 'pred-task', type: 'FS', lag: 0 }],
      },
    ];

    const { container } = render(
      <DependencyLines
        tasks={tasks}
        allTasks={tasks}
        monthStart={new Date('2026-03-01T00:00:00.000Z')}
        dayWidth={40}
        rowHeight={40}
        gridWidth={1240}
        selectedDep={{ predecessorId: 'pred-task', successorId: 'succ-task', linkType: 'FS' }}
      />
    );

    expect(container.querySelectorAll('.gantt-dependency-selected')).toHaveLength(1);
    expect(container.querySelectorAll('.gantt-dependency-selected-outline')).toHaveLength(0);
  });
});

it('keeps markers local and stable with a hidden sibling chart, including hover and selection', () => {
 const tasks: Task[] = [{id:'a',name:'A',startDate:'2026-03-01',endDate:'2026-03-02'}, {id:'b',name:'B',startDate:'2026-03-03',endDate:'2026-03-04',dependencies:[{taskId:'a',type:'FS',lag:0}]}];
 const props = {tasks,monthStart:new Date('2026-03-01T00:00:00Z'),dayWidth:40,rowHeight:40,gridWidth:1240,onDependencyClick:vi.fn()};
 const charts = (selected = false) => <><div style={{display:'none'}}><DependencyLines {...props}/></div><DependencyLines {...props} selectedDep={selected ? {predecessorId:'a',successorId:'b',linkType:'FS'} : undefined}/></>;
 const {container,rerender} = render(charts());
 const svgs = container.querySelectorAll('svg');
 const ids = Array.from(container.querySelectorAll('marker'), marker => marker.id);
 expect(new Set(ids).size).toBe(ids.length);
 const assertLocal = () => {
  for (const svg of svgs) for (const path of svg.querySelectorAll('.gantt-dependency-path')) {
   const id = path.getAttribute('marker-end')!.slice(5,-1);
   expect(Array.from(svg.querySelectorAll('marker')).some(marker => marker.id === id)).toBe(true);
  }
 };
 assertLocal();
 const line = svgs[1].querySelector('.gantt-dependency-line')!;
 fireEvent.pointerEnter(line);
 expect(svgs[1].querySelector('.gantt-dependency-path')?.getAttribute('marker-end')).toContain('arrowhead-hover');
 assertLocal();
 fireEvent.pointerLeave(line);
 rerender(charts(true));
 expect(svgs[1].querySelector('.gantt-dependency-path')?.getAttribute('marker-end')).toContain('arrowhead-selected');
 expect(Array.from(container.querySelectorAll('marker'), marker => marker.id)).toEqual(ids);
 assertLocal();
});
