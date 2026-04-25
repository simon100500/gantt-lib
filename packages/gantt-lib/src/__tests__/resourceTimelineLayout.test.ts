import { describe, expect, it } from 'vitest';
import { layoutResourceTimelineItems } from '../utils/resourceTimelineLayout';
import type { ResourceTimelineResource } from '../types';

const monthStart = new Date('2026-04-01T00:00:00Z');

describe('layoutResourceTimelineItems', () => {
  it('places non-overlapping same-resource items into one lane', () => {
    const resources: ResourceTimelineResource[] = [
      {
        id: 'resource-1',
        name: 'Resource 1',
        items: [
          { id: 'a', resourceId: 'resource-1', title: 'A', startDate: '2026-04-01', endDate: '2026-04-02' },
          { id: 'b', resourceId: 'resource-1', title: 'B', startDate: '2026-04-03', endDate: '2026-04-04' },
        ],
      },
    ];

    const result = layoutResourceTimelineItems(resources, { monthStart, dayWidth: 40, laneHeight: 32 });

    expect(result.rows[0].laneCount).toBe(1);
    expect(result.rows[0].resourceRowHeight).toBe(32);
    expect(result.items.map((item) => item.laneIndex)).toEqual([0, 0]);
  });

  it('uses multiple lanes when items overlap inclusively on the same day', () => {
    const resources: ResourceTimelineResource[] = [
      {
        id: 'resource-1',
        name: 'Resource 1',
        items: [
          { id: 'a', resourceId: 'resource-1', title: 'A', startDate: '2026-04-01', endDate: '2026-04-03' },
          { id: 'b', resourceId: 'resource-1', title: 'B', startDate: '2026-04-03', endDate: '2026-04-05' },
        ],
      },
    ];

    const result = layoutResourceTimelineItems(resources, { monthStart, dayWidth: 40, laneHeight: 32 });

    expect(result.rows[0].laneCount).toBe(2);
    expect(result.rows[0].resourceRowHeight).toBe(64);
    expect(result.items.map((item) => [item.itemId, item.laneIndex])).toEqual([
      ['a', 0],
      ['b', 1],
    ]);
    expect(result.rows[0].conflictCount).toBe(1);
    expect(result.items.map((item) => [item.itemId, item.conflictsWith])).toEqual([
      ['a', ['b']],
      ['b', ['a']],
    ]);
    expect(result.items[0].conflictRanges[0].startDate.toISOString()).toBe('2026-04-03T00:00:00.000Z');
    expect(result.items[0].conflictRanges[0].endDate.toISOString()).toBe('2026-04-03T00:00:00.000Z');
  });

  it('sorts equal-date items stably by id', () => {
    const resources: ResourceTimelineResource[] = [
      {
        id: 'resource-1',
        name: 'Resource 1',
        items: [
          { id: 'c', resourceId: 'resource-1', title: 'C', startDate: '2026-04-01', endDate: '2026-04-01' },
          { id: 'a', resourceId: 'resource-1', title: 'A', startDate: '2026-04-01', endDate: '2026-04-01' },
          { id: 'b', resourceId: 'resource-1', title: 'B', startDate: '2026-04-01', endDate: '2026-04-01' },
        ],
      },
    ];

    const result = layoutResourceTimelineItems(resources, { monthStart, dayWidth: 40, laneHeight: 32 });

    expect(result.items.map((item) => item.itemId)).toEqual(['a', 'b', 'c']);
  });

  it('reports invalid dates without throwing', () => {
    const resources: ResourceTimelineResource[] = [
      {
        id: 'resource-1',
        name: 'Resource 1',
        items: [
          { id: 'valid', resourceId: 'resource-1', title: 'Valid', startDate: '2026-04-01', endDate: '2026-04-01' },
          { id: 'invalid', resourceId: 'resource-1', title: 'Invalid', startDate: 'bad-date', endDate: '2026-04-02' },
        ],
      },
    ];

    const result = layoutResourceTimelineItems(resources, { monthStart, dayWidth: 40, laneHeight: 32 });

    expect(result.items.map((item) => item.itemId)).toEqual(['valid']);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        itemId: 'invalid',
        resourceId: 'resource-1',
        reason: 'invalid-date',
      }),
    ]);
  });

  it('keeps empty resource rows visible with one-lane height', () => {
    const resources: ResourceTimelineResource[] = [
      { id: 'empty', name: 'Empty', items: [] },
      {
        id: 'filled',
        name: 'Filled',
        items: [
          { id: 'a', resourceId: 'filled', title: 'A', startDate: '2026-04-02', endDate: '2026-04-02' },
        ],
      },
    ];

    const result = layoutResourceTimelineItems(resources, { monthStart, dayWidth: 40, laneHeight: 32 });

    expect(result.rows[0]).toMatchObject({
      resourceId: 'empty',
      laneCount: 1,
      resourceRowTop: 0,
      resourceRowHeight: 32,
    });
    expect(result.rows[1]).toMatchObject({
      resourceId: 'filled',
      resourceRowTop: 32,
      resourceRowHeight: 32,
    });
  });

  it('returns deterministic item geometry', () => {
    const resources: ResourceTimelineResource[] = [
      {
        id: 'resource-1',
        name: 'Resource 1',
        items: [
          { id: 'a', resourceId: 'resource-1', title: 'A', startDate: '2026-04-03', endDate: '2026-04-05' },
        ],
      },
    ];

    const result = layoutResourceTimelineItems(resources, { monthStart, dayWidth: 40, laneHeight: 32 });

    expect(result.items[0]).toMatchObject({
      itemId: 'a',
      resourceId: 'resource-1',
      laneIndex: 0,
      left: 80,
      width: 120,
      resourceRowTop: 0,
      resourceRowHeight: 32,
    });
  });
});
