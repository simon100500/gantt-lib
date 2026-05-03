/**
 * Export contract tests: verify the export map of core/scheduling
 * and its backward-compatibility chain through dependencyUtils.
 */
import { describe, it, expect } from 'vitest';
import type {
  GanttChartMode,
  ResourcePlannerChartProps,
  ResourceTimelineItem,
  ResourceTimelineMove,
  ResourceTimelineResource,
  TableMatrixModeProps,
  Task,
} from '../index';

describe('Export contract: core/scheduling', () => {
  it('root package exports the public gantt chart API without runtime regressions', async () => {
    const mod = await import('../index');
    expect(mod.GanttChart).toBeDefined();
    expect(mod.ResourceTimelineChart).toBeDefined();
    expect(mod.TaskList).toBeDefined();
  }, 10000);

  it('keeps resource planner public types usable from the root package', () => {
    const mode: GanttChartMode = 'resource-planner';
    const item: ResourceTimelineItem = {
      id: 'assignment-1',
      resourceId: 'resource-1',
      title: 'Assignment',
      startDate: '2026-04-01',
      endDate: '2026-04-03',
    };
    const resource: ResourceTimelineResource = {
      id: 'resource-1',
      name: 'Resource 1',
      items: [item],
    };
    const props: ResourcePlannerChartProps = {
      mode,
      resources: [resource],
      containerHeight: 'calc(100dvh - 132px)',
      onResourceItemMove: (move: ResourceTimelineMove) => {
        expect(move.fromResourceId).toBeDefined();
      },
    };

    expect(props.resources[0].items[0].id).toBe('assignment-1');
    expect(props.containerHeight).toBe('calc(100dvh - 132px)');
  });

  it('keeps table-matrix public types usable from the root package', () => {
    type FinanceTask = Task & { values: Record<string, number> };
    const props: TableMatrixModeProps<FinanceTask> = {
      mode: 'table-matrix',
      tasks: [{
        id: 'task-1',
        name: 'Финплан',
        startDate: '2026-04-01',
        endDate: '2026-04-07',
        values: { week1: 150000 },
      }],
      matrixColumns: [
        {
          id: 'week1',
          header: '01-07',
          width: 120,
          align: 'right',
          renderCell: (task) => task.values.week1.toLocaleString('ru-RU'),
        },
      ],
      hideTaskListRowActions: true,
    };

    const mode: GanttChartMode = props.mode;
    expect(mode).toBe('table-matrix');
    expect(props.matrixColumns[0].width).toBe(120);
    expect(props.hideTaskListRowActions).toBe(true);
  });

  it('exports command-level API from execute.ts', async () => {
    const mod = await import('../core/scheduling');
    expect(mod.moveTaskWithCascade).toBeDefined();
    expect(mod.resizeTaskWithCascade).toBeDefined();
    expect(mod.recalculateTaskFromDependencies).toBeDefined();
    expect(mod.recalculateProjectSchedule).toBeDefined();
    expect(typeof mod.moveTaskWithCascade).toBe('function');
  });

  it('exports domain types', async () => {
    // Type-only exports can't be checked at runtime, but we can verify the module loads
    const mod = await import('../core/scheduling');
    expect(mod).toBeDefined();
  });

  it('dependencyUtils re-exports all core scheduling functions', async () => {
    const mod = await import('../utils/dependencyUtils');
    expect(mod.moveTaskWithCascade).toBeDefined();
    expect(mod.universalCascade).toBeDefined();
    expect(mod.calculateSuccessorDate).toBeDefined();
    expect(mod.resolveDateRangeFromPixels).toBeDefined();
  });
});
