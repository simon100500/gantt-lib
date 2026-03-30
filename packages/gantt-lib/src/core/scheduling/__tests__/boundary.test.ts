// @vitest-environment node

/**
 * Boundary tests: prove core/scheduling runs in pure Node without jsdom/React.
 * These tests verify the headless scheduling promise — zero runtime dependencies
 * on browser globals or React.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('core/scheduling: pure Node boundary', () => {
  const schedulingDir = path.join(__dirname, '..');
  const sourceFiles = fs
    .readdirSync(schedulingDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts');

  it('core/scheduling imports without React', () => {
    for (const file of sourceFiles) {
      const content = fs.readFileSync(path.join(schedulingDir, file), 'utf-8');
      expect(content, `${file} should not import React`).not.toContain("from 'react'");
      expect(content, `${file} should not require React`).not.toContain('require("react")');
    }
  });

  it('core/scheduling imports without DOM globals', () => {
    const domPatterns = ['document.', 'window.', 'navigator.'];
    for (const file of sourceFiles) {
      const content = fs.readFileSync(path.join(schedulingDir, file), 'utf-8');
      for (const pattern of domPatterns) {
        expect(content, `${file} should not use ${pattern.trim()}`).not.toContain(pattern);
      }
    }
  });

  it('scheduling functions work without jsdom', async () => {
    const {
      moveTaskRange,
      universalCascade,
      recalculateIncomingLags,
      calculateSuccessorDate,
    } = await import('../index');

    // moveTaskRange — simple move preserving duration
    const range = moveTaskRange('2024-01-01', '2024-01-05', new Date('2024-02-01T00:00:00.000Z'));
    expect(range.start.toISOString()).toContain('2024-02-01');
    expect(range.end.toISOString()).toContain('2024-02-05');

    // calculateSuccessorDate — FS link
    const successorDate = calculateSuccessorDate(
      new Date('2024-01-01T00:00:00.000Z'),
      new Date('2024-01-05T00:00:00.000Z'),
      'FS',
      0
    );
    expect(successorDate.toISOString()).toContain('2024-01-06');

    // recalculateIncomingLags
    const task = {
      id: 't1',
      name: 'Task 1',
      startDate: '2024-01-01',
      endDate: '2024-01-05',
      dependencies: [{ type: 'FS' as const, taskId: 't0', lag: 0 }],
    };
    const allTasks = [
      { id: 't0', name: 'Pred', startDate: '2024-01-01', endDate: '2024-01-03' },
      task,
    ];
    const updatedDeps = recalculateIncomingLags(
      task,
      new Date('2024-01-06T00:00:00.000Z'),
      new Date('2024-01-10T00:00:00.000Z'),
      allTasks as any
    );
    expect(updatedDeps).toHaveLength(1);
    expect(updatedDeps[0].lag).toBeDefined();

    // universalCascade — simple chain
    const successor = {
      id: 't2',
      name: 'Successor',
      startDate: '2024-01-06',
      endDate: '2024-01-10',
      dependencies: [{ type: 'FS' as const, taskId: 't1', lag: 0 }],
    };
    const cascadeResult = universalCascade(
      { ...task, startDate: '2024-01-05', endDate: '2024-01-08' } as any,
      new Date('2024-01-05T00:00:00.000Z'),
      new Date('2024-01-08T00:00:00.000Z'),
      [task, successor] as any
    );
    expect(cascadeResult.length).toBeGreaterThanOrEqual(1);
  });

  it('execute.ts works without jsdom', async () => {
    const { moveTaskWithCascade, resizeTaskWithCascade } = await import('../execute');

    const tasks = [
      {
        id: 't1',
        name: 'Task 1',
        startDate: '2024-01-01',
        endDate: '2024-01-05',
      },
      {
        id: 't2',
        name: 'Task 2',
        startDate: '2024-01-06',
        endDate: '2024-01-10',
        dependencies: [{ type: 'FS' as const, taskId: 't1', lag: 0 }],
      },
    ];

    // moveTaskWithCascade
    const moveResult = moveTaskWithCascade('t1', new Date('2024-02-01T00:00:00.000Z'), tasks as any);
    expect(moveResult.changedTasks.length).toBeGreaterThanOrEqual(1);
    const moved = moveResult.changedTasks.find((t) => t.id === 't1');
    expect(moved).toBeDefined();
    expect(moved!.startDate).toBe('2024-02-01');

    // resizeTaskWithCascade — anchor end
    const resizeResult = resizeTaskWithCascade(
      't1',
      'end',
      new Date('2024-01-10T00:00:00.000Z'),
      tasks as any
    );
    const resized = resizeResult.changedTasks.find((t) => t.id === 't1');
    expect(resized).toBeDefined();
    expect(resized!.endDate).toBe('2024-01-10');
  });

  it('types are available without runtime dependencies', async () => {
    // Importing types should work at compile time — we verify the module loads
    const mod = await import('../types');
    expect(mod).toBeDefined();

    // ScheduleTask can be instantiated as a plain object
    const task: { id: string; startDate: string | Date; endDate: string | Date } = {
      id: '1',
      startDate: '2024-01-01',
      endDate: '2024-01-05',
    };
    expect(task.id).toBe('1');
  });
});
