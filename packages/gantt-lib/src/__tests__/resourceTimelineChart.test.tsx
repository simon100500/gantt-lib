import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('QA')).toBeInTheDocument();
  });

  it('renders default item bars with title, subtitle, and date label', () => {
    render(<ResourceTimelineChart mode="resource-planner" resources={resources} />);

    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Client work')).toBeInTheDocument();
    expect(screen.getByText('3–5 апр')).toBeInTheDocument();
  });

  it('renders resource item bars with fixed visual spacing inside lanes', () => {
    const { container } = render(
      <ResourceTimelineChart mode="resource-planner" resources={resources} dayWidth={40} laneHeight={40} />
    );

    const item = container.querySelector('[data-resource-item-id="discovery"]') as HTMLElement;
    expect(item.style.left).toBe('81px');
    expect(item.style.top).toBe('2px');
    expect(item.style.width).toBe('118px');
    expect(item.style.height).toBe('36px');
  });

  it('keeps empty resources visible with one-lane height', () => {
    const { container } = render(<ResourceTimelineChart mode="resource-planner" resources={resources} laneHeight={36} />);

    const qaRow = container.querySelector('[data-resource-row-id="qa"]') as HTMLElement;
    expect(qaRow).toBeTruthy();
    expect(qaRow.style.height).toBe('36px');
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
    expect(devRow.style.height).toBe('68px');
  });

  it('keeps a two-pixel vertical gap between bars in adjacent lanes', () => {
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
});
