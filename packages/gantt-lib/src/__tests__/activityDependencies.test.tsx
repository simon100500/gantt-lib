// START_MODULE_CONTRACT
// PURPOSE: Verify explicit activity graphs use native Gantt dependency paths instead of center-to-center overlays or inferred adjacency.
// SCOPE: Cross-row and cross-lane ports, scoped IDs, edge types, lag visibility, empty graph and row virtualization.
// INPUTS: Controlled GanttChart tasks and activityDependencies.
// OUTPUTS: Native renderer route and visibility assertions.
// PAN_COST: A 5000-bar graph is projected once; vertical/diagonal pan reuses packing, ports, paths and topology.
// TOUCH_COUPLING: Verify touching FS zero-lag rounded dash joints without hit targets or interactions.
// ACTIVITY_PORTS: Cross-row/lane links use demo-compatible 6px top/bottom insets in both vertical directions; same-lane links remain centered on side edges.
// END_MODULE_CONTRACT
import React from 'react';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GanttChart } from '../components/GanttChart';
import type { Task, TaskActivityDependency, ActivityDependencyHighlight } from '../types';
import { ActivityDependencyLines } from '../components/DependencyLines/ActivityDependencyLines';
import * as activityGeometry from '../utils/activities';
import * as geometry from '../utils/geometry';
import * as dependencyUtils from '../utils/dependencyUtils';
import { calculateDependencyPath } from '../utils/geometry';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const task = (id: string, date: string): Task => ({ id, name: id, startDate: date, endDate: date, activities: [{ id: 'work', name: id, startDate: date, endDate: date }] });
const edge: TaskActivityDependency = { predecessorTaskId: 'one', predecessorActivityId: 'work', successorTaskId: 'two', successorActivityId: 'work', type: 'FS', lag: 3 };
const chainHighlight: ActivityDependencyHighlight = { activities: [{ taskId: 'one', activityId: 'work' }, { taskId: 'two', activityId: 'work' }], mode: 'chain' };
const chart = (tasks: Task[], edges: TaskActivityDependency[] | undefined, showLag = true, highlight?: ActivityDependencyHighlight) => <GanttChart tasks={tasks} activityDependencies={edges} activityDependencyHighlight={highlight} dateRange={{start:new Date('2026-10-01T00:00:00Z'),end:new Date('2026-10-31T00:00:00Z')}} dayWidth={24} rowHeight={40} containerHeight={400} showActivityLag={showLag} businessDays={false} />;
describe('native explicit activity dependencies', () => {
  it('does not rebuild activity paths across real GanttChart horizontal, vertical or diagonal scroll buckets', () => {
    const tasks:Task[]=Array.from({length:125},(_,r)=>({id:`r${r}`,name:`r${r}`,startDate:'2026-10-01',endDate:'2026-11-09',activities:Array.from({length:40},(_,a)=>({id:`a${a}`,name:`a${a}`,startDate:new Date(Date.UTC(2026,9,1+a)),endDate:new Date(Date.UTC(2026,9,1+a))}))}));
    const dependencies:TaskActivityDependency[]=tasks.flatMap(t=>t.activities!.slice(1).map((a,i)=>({predecessorTaskId:t.id,predecessorActivityId:t.activities![i].id,successorTaskId:t.id,successorActivityId:a.id,type:'FS',lag:0})));
    let frames:FrameRequestCallback[]=[];
    const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.push(cb);return frames.length;});
    const ports=vi.spyOn(geometry,'resolveTaskHorizontalGeometry');
    const cycles=vi.spyOn(dependencyUtils,'detectCycles');
    const paths=vi.spyOn(geometry,'calculateDependencyPath');
    const {container}=render(<GanttChart tasks={tasks} activityDependencies={dependencies} dayWidth={24} rowHeight={40} containerHeight={400} businessDays={false} />);
    const scroll=container.querySelector<HTMLElement>('.gantt-scrollContainer')!;
    Object.defineProperty(scroll,'clientHeight',{value:400});Object.defineProperty(scroll,'clientWidth',{value:1000});
    const flush=()=>act(()=>{const callbacks=frames;frames=[];callbacks.forEach(cb=>cb(0));});
    flush();
    const initial=ports.mock.calls.length;
    const initialCycles=cycles.mock.calls.length;
    const initialPaths=paths.mock.calls.length;
    scroll.scrollLeft=480;fireEvent.scroll(scroll);flush();
    expect(ports.mock.calls.length).toBe(initial);
    scroll.scrollLeft=960;fireEvent.scroll(scroll);flush();
    expect(ports.mock.calls.length).toBe(initial);
    scroll.scrollTop=640;fireEvent.scroll(scroll);flush();
    expect(ports.mock.calls.length).toBeGreaterThan(initial);
    expect(container.querySelectorAll('.gantt-dependency-coupling').length).toBeGreaterThan(0);
    expect(cycles.mock.calls.length).toBe(initialCycles);
    expect(paths.mock.calls.length).toBe(initialPaths);
    scroll.scrollTop=3200;scroll.scrollLeft=480;fireEvent.scroll(scroll);flush();
    expect(paths.mock.calls.length).toBe(initialPaths);
    expect(cycles.mock.calls.length).toBe(initialCycles);
    ports.mockRestore();cycles.mockRestore();raf.mockRestore();
  });
  it('reuses the full 5000-bar graph geometry while only mounting visible edges', () => {
    const tasks:Task[]=Array.from({length:125},(_,r)=>({id:`r${r}`,name:`r${r}`,startDate:'2026-10-01',endDate:'2026-11-09',activities:Array.from({length:40},(_,a)=>({id:`a${a}`,name:`a${a}`,startDate:new Date(Date.UTC(2026,9,1+a)),endDate:new Date(Date.UTC(2026,9,1+a))}))}));
    const dependencies:TaskActivityDependency[]=tasks.flatMap(t=>t.activities!.slice(1).map((a,i)=>({predecessorTaskId:t.id,predecessorActivityId:t.activities![i].id,successorTaskId:t.id,successorActivityId:a.id,type:'FS',lag:0})));
    const packing=vi.spyOn(activityGeometry,'computeActivityLanes');
    const ports=vi.spyOn(geometry,'resolveTaskHorizontalGeometry');
    const paths=vi.spyOn(geometry,'calculateDependencyPath');
    const props={tasks,dependencies,monthStart:new Date('2026-10-01T00:00:00Z'),dayWidth:24,rowHeight:40,gridWidth:4000,totalHeight:5000,rowIndexByTaskId:new Map(tasks.map((t,i)=>[t.id,i])),rowTops:tasks.map((_,i)=>i*40),rowHeights:tasks.map(()=>40),renderedTaskIds:new Set(['r0']),showLag:true};
    const {container,rerender}=render(<ActivityDependencyLines {...props} horizontalWindow={{startPx:0,endPx:1000}} />);
    expect(packing).toHaveBeenCalledTimes(125);expect(ports).toHaveBeenCalledTimes(5000);
    expect(paths).toHaveBeenCalledTimes(4875);
    expect(container.querySelectorAll('.gantt-dependency-coupling')).toHaveLength(39);
    fireEvent.pointerEnter(container.querySelector('.gantt-dependency-line')!);
    rerender(<ActivityDependencyLines {...props} horizontalWindow={{startPx:100,endPx:1100}} />);
    expect(packing).toHaveBeenCalledTimes(125);expect(ports).toHaveBeenCalledTimes(5000);
    // Large vertical and diagonal jumps must only select cached geometry.
    for (const row of ['r124', 'r50', 'r0']) {
      rerender(<ActivityDependencyLines {...props} renderedTaskIds={new Set([row])} horizontalWindow={{startPx:0,endPx:1000}} />);
      expect(container.querySelectorAll('.gantt-dependency-coupling')).toHaveLength(39);
      expect(packing).toHaveBeenCalledTimes(125);
      expect(ports).toHaveBeenCalledTimes(5000);
      expect(paths).toHaveBeenCalledTimes(4875);
    }
    packing.mockRestore();ports.mockRestore();
  });
  it('renders a joint only for an explicit touching FS edge without lag', () => {
    const row:Task={id:'one',name:'one',startDate:'2026-10-01',endDate:'2026-10-04',activities:[{id:'first',name:'first',startDate:'2026-10-01',endDate:'2026-10-01'},{id:'second',name:'second',startDate:'2026-10-02',endDate:'2026-10-04'}]};
    const touching={...edge,predecessorActivityId:'first',successorTaskId:'one',successorActivityId:'second',lag:0};
    const {container,rerender}=render(<GanttChart tasks={[row]} activityDependencies={[touching]} dayWidth={24} rowHeight={40} businessDays={false} dateRange={{start:new Date('2026-10-01T00:00:00Z'),end:new Date('2026-10-31T00:00:00Z')}} />);
    const joint=container.querySelector('.gantt-dependency-coupling')!;
    expect(joint.tagName).toBe('line');expect(joint.getAttribute('x1')).toBe('19.5');expect(joint.getAttribute('x2')).toBe('28.5');expect(joint.getAttribute('y1')).toBe('20');expect(joint.getAttribute('y2')).toBe('20');
    expect(container.querySelector('path.gantt-dependency-path')).toBeNull();
    expect(container.querySelector('.gantt-dependency-coupling-hit-area')).toBeNull();
    expect(joint.parentElement?.getAttribute('role')).toBeNull();
    fireEvent.pointerEnter(joint.parentElement!);
    expect(container.querySelector('.gantt-dependency-line-hovered')).toBeNull();
    for(const dependency of [{...touching,lag:1},{...touching,type:'SS' as const}]) {
      rerender(chart([row],[dependency]));expect(container.querySelector('.gantt-dependency-coupling')).toBeNull();expect(container.querySelector('path.gantt-dependency-path')).not.toBeNull();
    }
    rerender(chart([row],[]));expect(container.querySelector('.gantt-dependency-coupling')).toBeNull();
  });
  it('splits rendering: inferred sequence in the row, explicit graph in the overlay', () => {
    const row:Task={id:'one',name:'one',startDate:'2026-10-01',endDate:'2026-10-04',activities:[{id:'first',name:'first',startDate:'2026-10-01',endDate:'2026-10-01'},{id:'second',name:'second',startDate:'2026-10-02',endDate:'2026-10-02'},{id:'third',name:'third',startDate:'2026-10-02',endDate:'2026-10-04'}]};
    // Выведенная последовательность — построчный рендер: у касания стрелки нет,
    // наложение second/third рисуется Г-образной связью в строке, без сцепок.
    const {container,rerender}=render(chart([row],undefined));
    expect(container.querySelectorAll('.gantt-dependency-coupling')).toHaveLength(0);
    expect(container.querySelector('svg.gantt-tr-activityLinksSvg')).not.toBeNull();
    // Явный граф того же вида — оверлей: касание помечается сцепкой.
    rerender(chart([row],[{...edge,predecessorActivityId:'first',successorTaskId:'one',successorActivityId:'second',lag:0},{...edge,predecessorActivityId:'second',successorTaskId:'one',successorActivityId:'third',lag:0}]));
    expect(container.querySelectorAll('.gantt-dependency-coupling')).toHaveLength(1);
    // Пустой явный граф — связей нет, построчный вывод тоже не включается
    // (явный пустой граф запрещает вывод последовательности).
    rerender(chart([row],[]));
    expect(container.querySelector('.gantt-tr-activityLinksSvg')).toBeNull();
    expect(container.querySelector('.gantt-dependency-path')).toBeNull();
  });
  it('keeps same-lane horizontal links on side centers', () => {
    const row:Task={id:'one',name:'one',startDate:'2026-10-01',endDate:'2026-10-04',activities:[{id:'first',name:'first',startDate:'2026-10-01',endDate:'2026-10-01'},{id:'second',name:'second',startDate:'2026-10-03',endDate:'2026-10-04'}]};
    const {container}=render(chart([row],[{...edge,predecessorActivityId:'first',successorTaskId:'one',successorActivityId:'second'}]));
    expect(container.querySelector('.gantt-dependency-path')?.getAttribute('d')).toBe(calculateDependencyPath({x:24,y:20},{x:48,y:20},false));
  });
  it.each([['chain',1],['chain-incoming',2],['chain-outgoing',2],['chain-all',3]] as const)('selects %s without leaking unrelated links', (mode,count) => {
    const tasks=[task('before','2026-10-01'),task('one','2026-10-03'),task('two','2026-10-06'),task('after','2026-10-09'),task('unrelated','2026-10-12')];
    const edges=[edge,{...edge,predecessorTaskId:'before',successorTaskId:'one',lag:11},{...edge,predecessorTaskId:'two',successorTaskId:'after',lag:22},{...edge,predecessorTaskId:'after',successorTaskId:'unrelated',lag:33}];
    const highlight:ActivityDependencyHighlight={activities:[{taskId:'one',activityId:'work'},{taskId:'two',activityId:'work'}],mode};
    const {container,rerender}=render(<GanttChart tasks={tasks} activityDependencies={edges} activityDependencyHighlight={highlight} dayWidth={24} rowHeight={40} containerHeight={400} businessDays={false} />);
    expect(container.querySelectorAll('.gantt-dependency-path')).toHaveLength(count);
    const labels=[...container.querySelectorAll('.gantt-dependency-lag-label')].map(label=>label.textContent);
    expect(labels).toContain('+3');expect(labels.includes('+11')).toBe(mode==='chain-incoming'||mode==='chain-all');expect(labels.includes('+22')).toBe(mode==='chain-outgoing'||mode==='chain-all');expect(labels).not.toContain('+33');
    rerender(<GanttChart tasks={tasks} activityDependencies={edges} dayWidth={24} rowHeight={40} containerHeight={400} businessDays={false} />);
    // Выделение снято: все ребра межстрочные — без выделенной цепочки скрыты.
    expect(container.querySelectorAll('.gantt-dependency-path')).toHaveLength(0);
  });
  it('shows cross-row links only while a chain is selected and keeps geometry then', () => {
    const { container, rerender } = render(chart([task('one','2026-10-01'),task('two','2026-10-03')],[edge],true,chainHighlight));
    const paths=()=>container.querySelectorAll('.gantt-dependency-path');
    // Выделенная цепочка: вертикальная связь видна и держит порты краёв полос.
    expect(paths()).toHaveLength(1);
    // A 24px bar sits at y=8 in a 40px row: down-route exits at 26 and enters at 54 (6px insets).
    expect(paths()[0].getAttribute('d')).toBe(calculateDependencyPath({x:24,y:26},{x:48,y:54},false));
    expect(paths()[0].getAttribute('d')).not.toContain('20');
    expect(container.querySelector('.gantt-dependency-lag-label')?.textContent).toBe('+3');
    rerender(chart([task('one','2026-10-01'),task('two','2026-10-03')],[edge],false,chainHighlight));
    expect(container.querySelector('.gantt-dependency-lag-label')).toBeNull();
    // Выделение снято: межстрочные связи скрыты («основное — по строкам»).
    rerender(chart([task('one','2026-10-01'),task('two','2026-10-03')],[edge]));
    expect(paths()).toHaveLength(0);
    rerender(chart([task('one','2026-10-01'),task('two','2026-10-03')],[]));
    expect(paths()).toHaveLength(0);
  });
  it.each(['FS','SS','FF','SF'] as const)('honors %s endpoints and controlled date changes', type => {
    const { container, rerender }=render(chart([task('one','2026-10-01'),task('two','2026-10-03')],[{...edge,type}],true,chainHighlight));
    const x1=type==='SS'||type==='SF'?0:24, x2=type==='FF'||type==='SF'?72:48;
    expect(container.querySelector('.gantt-dependency-path')?.getAttribute('d')).toBe(calculateDependencyPath({x:x1,y:26},{x:x2,y:54},type==='FF'||type==='SF'));
    rerender(chart([task('one','2026-10-04'),task('two','2026-10-03')],[{...edge,type}],true,chainHighlight));
    expect(container.querySelector('.gantt-dependency-path')?.getAttribute('d')).toBe(calculateDependencyPath({x:x1+72,y:26},{x:x2,y:54},type==='FF'||type==='SF'));
    rerender(chart([task('two','2026-10-03'),task('one','2026-10-04')],[{...edge,type}],true,chainHighlight));
    expect(container.querySelector('.gantt-dependency-path')?.getAttribute('d')).toBe(calculateDependencyPath({x:x1+72,y:54},{x:x2,y:26},type==='FF'||type==='SF'));
  });
  it('routes packed lanes by actual vertical position and does not infer extra links', () => {
    const row: Task={id:'one',name:'one',startDate:'2026-10-01',endDate:'2026-10-05',activities:[{id:'later',name:'later',startDate:'2026-10-03',endDate:'2026-10-05'},{id:'early',name:'early',startDate:'2026-10-01',endDate:'2026-10-04'}]};
    const {container}=render(chart([row],[{...edge,predecessorActivityId:'early',successorTaskId:'one',successorActivityId:'later'}]));
    const bars=[...container.querySelectorAll<HTMLElement>('[data-activity-id]')];
    const early=bars.find(b=>b.dataset.activityId==='early')!,later=bars.find(b=>b.dataset.activityId==='later')!;
    expect(parseFloat(early.style.top)).toBeLessThan(parseFloat(later.style.top));
    const from={x:96,y:parseFloat(early.style.top)+18},to={x:48,y:parseFloat(later.style.top)+6};
    expect(container.querySelector('.gantt-dependency-path')?.getAttribute('d')).toBe(calculateDependencyPath(from,to,false));
    expect(container.querySelectorAll('.gantt-dependency-path')).toHaveLength(1);
  });
});
