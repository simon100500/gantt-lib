// START_MODULE_CONTRACT
// PURPOSE: Verify explicit activity graphs use native Gantt dependency paths instead of center-to-center overlays or inferred adjacency.
// SCOPE: Cross-row and cross-lane ports, scoped IDs, edge types, lag visibility, empty graph and row virtualization.
// INPUTS: Controlled GanttChart tasks and activityDependencies.
// OUTPUTS: Native renderer route and visibility assertions.
// PAN_COST: A 5000-bar graph projects only incident visible rows; hover and horizontal window changes reuse geometry.
// TOUCH_COUPLING: Verify touching FS zero-lag joints, exclusions, and enlarged hit targets.
// ACTIVITY_PORTS: Cross-row/lane links use demo-compatible 6px top/bottom insets in both vertical directions; same-lane links remain centered on side edges.
// END_MODULE_CONTRACT
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GanttChart } from '../components/GanttChart';
import type { Task, TaskActivityDependency, ActivityDependencyHighlight } from '../types';
import { ActivityDependencyLines } from '../components/DependencyLines/ActivityDependencyLines';
import * as activityGeometry from '../utils/activities';
import * as geometry from '../utils/geometry';
import { calculateDependencyPath } from '../utils/geometry';

afterEach(cleanup);
const task = (id: string, date: string): Task => ({ id, name: id, startDate: date, endDate: date, activities: [{ id: 'work', name: id, startDate: date, endDate: date }] });
const edge: TaskActivityDependency = { predecessorTaskId: 'one', predecessorActivityId: 'work', successorTaskId: 'two', successorActivityId: 'work', type: 'FS', lag: 3 };
const chart = (tasks: Task[], edges: TaskActivityDependency[] | undefined, showLag = true) => <GanttChart tasks={tasks} activityDependencies={edges} dateRange={{start:new Date('2026-10-01T00:00:00Z'),end:new Date('2026-10-31T00:00:00Z')}} dayWidth={24} rowHeight={40} containerHeight={400} showActivityLag={showLag} businessDays={false} />;
describe('native explicit activity dependencies', () => {
  it('keeps pan/hover geometry bounded on the 5000-bar demo', () => {
    const tasks:Task[]=Array.from({length:125},(_,r)=>({id:`r${r}`,name:`r${r}`,startDate:'2026-10-01',endDate:'2026-11-09',activities:Array.from({length:40},(_,a)=>({id:`a${a}`,name:`a${a}`,startDate:new Date(Date.UTC(2026,9,1+a)),endDate:new Date(Date.UTC(2026,9,1+a))}))}));
    const dependencies:TaskActivityDependency[]=tasks.flatMap(t=>t.activities!.slice(1).map((a,i)=>({predecessorTaskId:t.id,predecessorActivityId:t.activities![i].id,successorTaskId:t.id,successorActivityId:a.id,type:'FS',lag:0})));
    const packing=vi.spyOn(activityGeometry,'computeActivityLanes');
    const ports=vi.spyOn(geometry,'resolveTaskHorizontalGeometry');
    const props={tasks,dependencies,monthStart:new Date('2026-10-01T00:00:00Z'),dayWidth:24,rowHeight:40,gridWidth:4000,totalHeight:5000,rowIndexByTaskId:new Map(tasks.map((t,i)=>[t.id,i])),rowTops:tasks.map((_,i)=>i*40),rowHeights:tasks.map(()=>40),renderedTaskIds:new Set(['r0']),showLag:true};
    const {container,rerender}=render(<ActivityDependencyLines {...props} horizontalWindow={{startPx:0,endPx:1000}} />);
    expect(packing).toHaveBeenCalledTimes(1);expect(ports).toHaveBeenCalledTimes(40);
    expect(container.querySelectorAll('.gantt-dependency-coupling')).toHaveLength(39);
    fireEvent.pointerEnter(container.querySelector('.gantt-dependency-line')!);
    rerender(<ActivityDependencyLines {...props} horizontalWindow={{startPx:100,endPx:1100}} />);
    expect(packing).toHaveBeenCalledTimes(1);expect(ports).toHaveBeenCalledTimes(40);
    packing.mockRestore();ports.mockRestore();
  });
  it('renders a joint only for an explicit touching FS edge without lag', () => {
    const row:Task={id:'one',name:'one',startDate:'2026-10-01',endDate:'2026-10-04',activities:[{id:'first',name:'first',startDate:'2026-10-01',endDate:'2026-10-01'},{id:'second',name:'second',startDate:'2026-10-02',endDate:'2026-10-04'}]};
    const touching={...edge,predecessorActivityId:'first',successorTaskId:'one',successorActivityId:'second',lag:0};
    const {container,rerender}=render(<GanttChart tasks={[row]} activityDependencies={[touching]} dayWidth={24} rowHeight={40} businessDays={false} dateRange={{start:new Date('2026-10-01T00:00:00Z'),end:new Date('2026-10-31T00:00:00Z')}} />);
    const joint=container.querySelector('.gantt-dependency-coupling')!;
    expect(joint.tagName).toBe('circle');expect(joint.getAttribute('cx')).toBe('24');expect(joint.getAttribute('cy')).toBe('20');
    expect(container.querySelector('path.gantt-dependency-path')).toBeNull();
    expect(container.querySelector('.gantt-dependency-coupling-hit-area')?.getAttribute('r')).toBe('12');
    for(const dependency of [{...touching,lag:1},{...touching,type:'SS' as const}]) {
      rerender(chart([row],[dependency]));expect(container.querySelector('.gantt-dependency-coupling')).toBeNull();expect(container.querySelector('path.gantt-dependency-path')).not.toBeNull();
    }
    rerender(chart([row],[]));expect(container.querySelector('.gantt-dependency-coupling')).toBeNull();
  });
  it('uses the same joints and arrow geometry for demo sequence and explicit graphs', () => {
    const row:Task={id:'one',name:'one',startDate:'2026-10-01',endDate:'2026-10-04',activities:[{id:'first',name:'first',startDate:'2026-10-01',endDate:'2026-10-01'},{id:'second',name:'second',startDate:'2026-10-02',endDate:'2026-10-02'},{id:'third',name:'third',startDate:'2026-10-02',endDate:'2026-10-04'}]};
    const {container,rerender}=render(chart([row],undefined));
    expect(container.querySelectorAll('.gantt-dependency-coupling')).toHaveLength(1);
    const route=container.querySelector('path.gantt-dependency-path')?.getAttribute('d');
    expect(route).toBeTruthy();
    rerender(chart([row],[{...edge,predecessorActivityId:'first',successorTaskId:'one',successorActivityId:'second',lag:0},{...edge,predecessorActivityId:'second',successorTaskId:'one',successorActivityId:'third',lag:0}]));
    expect(container.querySelectorAll('.gantt-dependency-coupling')).toHaveLength(1);
    expect(container.querySelector('path.gantt-dependency-path')?.getAttribute('d')).toBe(route);
    rerender(chart([row],[]));expect(container.querySelector('.gantt-dependency-path')).toBeNull();
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
    expect(container.querySelectorAll('.gantt-dependency-path')).toHaveLength(4);
  });
  it('uses top/bottom native ports and corners, even when IDs repeat in different rows', () => {
    const { container, rerender } = render(chart([task('one','2026-10-01'),task('two','2026-10-03')],[edge]));
    const paths=()=>container.querySelectorAll('.gantt-dependency-path');
    expect(paths()).toHaveLength(1);
    // A 24px bar sits at y=8 in a 40px row: down-route exits at 26 and enters at 54 (6px insets).
    expect(paths()[0].getAttribute('d')).toBe(calculateDependencyPath({x:24,y:26},{x:48,y:54},false));
    expect(paths()[0].getAttribute('d')).not.toContain('20');
    expect(container.querySelector('.gantt-dependency-lag-label')?.textContent).toBe('+3');
    rerender(chart([task('one','2026-10-01'),task('two','2026-10-03')],[edge],false));
    expect(container.querySelector('.gantt-dependency-lag-label')).toBeNull();
    rerender(chart([task('one','2026-10-01'),task('two','2026-10-03')],[]));
    expect(paths()).toHaveLength(0);
  });
  it.each(['FS','SS','FF','SF'] as const)('honors %s endpoints and controlled date changes', type => {
    const { container, rerender }=render(chart([task('one','2026-10-01'),task('two','2026-10-03')],[{...edge,type}]));
    const x1=type==='SS'||type==='SF'?0:24, x2=type==='FF'||type==='SF'?72:48;
    expect(container.querySelector('.gantt-dependency-path')?.getAttribute('d')).toBe(calculateDependencyPath({x:x1,y:26},{x:x2,y:54},type==='FF'||type==='SF'));
    rerender(chart([task('one','2026-10-04'),task('two','2026-10-03')],[{...edge,type}]));
    expect(container.querySelector('.gantt-dependency-path')?.getAttribute('d')).toBe(calculateDependencyPath({x:x1+72,y:26},{x:x2,y:54},type==='FF'||type==='SF'));
    rerender(chart([task('two','2026-10-03'),task('one','2026-10-04')],[{...edge,type}]));
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
