import { describe, expect, it } from 'vitest';
import { COLUMN_GAP, computeNetworkLayout, NODE_WIDTH } from '../components/NetworkGraph/layout';
import type { NetworkGraphEdge, NetworkGraphNode } from '../components/NetworkGraph/types';

// Данные демо-страницы: «Благоустройство» — цель длинной связи z1→blg
const NODES: NetworkGraphNode[] = [
  { id: 'z1', label: 'Земляные работы I' },
  { id: 'z2', label: 'Земляные работы II' },
  { id: 'f1', label: 'Устройство фундаментов I' },
  { id: 'f2', label: 'Устройство фундаментов II' },
  { id: 'm1', label: 'Монтаж оборудования I' },
  { id: 'm2', label: 'Монтаж оборудования II' },
  { id: 'el1', label: 'Электромонтажные работы I' },
  { id: 'el2', label: 'Электромонтажные работы II' },
  { id: 'os', label: 'Общестроительные работы' },
  { id: 'ot1', label: 'Отделочные работы и полы I' },
  { id: 'ot2', label: 'Отделочные работы и полы II' },
  { id: 'blg', label: 'Благоустройство' },
  { id: 'nal', label: 'Наладка и сдача' },
];
const EDGES: NetworkGraphEdge[] = [
  { source: 'z1', target: 'z2' },
  { source: 'z1', target: 'f1' },
  { source: 'z2', target: 'f2' },
  { source: 'z1', target: 'blg' },
  { source: 'f1', target: 'm1' },
  { source: 'f1', target: 'os' },
  { source: 'f2', target: 'm2' },
  { source: 'm1', target: 'el1' },
  { source: 'm2', target: 'el2' },
  { source: 'os', target: 'ot1' },
  { source: 'el1', target: 'ot1' },
  { source: 'el2', target: 'ot2' },
  { source: 'ot1', target: 'ot2' },
  { source: 'ot1', target: 'blg' },
  { source: 'blg', target: 'nal' },
  { source: 'ot2', target: 'nal' },
];

describe('network graph layout (demo data)', () => {
  it('keeps the start near the beginning without forcing a global row grid', async () => {
    const layout = await computeNetworkLayout(NODES, EDGES);
    // стартовый блок (z1) остаётся в верхней половине потока, но его y не
    // обязан совпадать с глобальной линией остальных вершин.
    const maxY = Math.max(...layout.nodes.map(n => n.y));
    const z1 = layout.nodes.find(n => n.id === 'z1')!;
    expect(z1.y).toBeLessThanOrEqual(maxY / 2);
  });

  it('uses one steady pitch for structural columns without dates', async () => {
    const layout = await computeNetworkLayout(NODES, EDGES);
    const columns = [...new Set(layout.nodes.map(node => Math.round(node.x)))].sort((a, b) => a - b);
    for (let index = 1; index < columns.length; index++) {
      expect(columns[index] - columns[index - 1]).toBe(NODE_WIDTH + COLUMN_GAP);
    }
  });

  it('uses start dates as a soft horizontal schedule', async () => {
    const nodes: NetworkGraphNode[] = [
      { id: 'start', label: 'Старт', startDate: '2026-01-01' },
      { id: 'middle', label: 'Середина', startDate: '2026-03-01' },
      { id: 'late', label: 'Финиш', startDate: '2026-06-01' },
    ];
    const layout = await computeNetworkLayout(nodes, [
      { source: 'start', target: 'middle' },
      { source: 'middle', target: 'late' },
    ]);
    const x = new Map(layout.nodes.map(n => [n.id, n.x]));
    expect(x.get('start')).toBeLessThan(x.get('middle')!);
    expect(x.get('middle')).toBeLessThan(x.get('late')!);
    expect(x.get('late')! - x.get('middle')!).toBeGreaterThan(0);
  });

  it('keeps every dependency moving left-to-right after column compaction', async () => {
    const layout = await computeNetworkLayout(NODES, EDGES);
    const nodeById = new Map(layout.nodes.map(node => [node.id, node]));
    for (const edge of EDGES) {
      expect(nodeById.get(edge.target)!.x).toBeGreaterThan(nodeById.get(edge.source)!.x);
    }
  });

  it('renders every demo edge without intermediate bends', async () => {
    const layout = await computeNetworkLayout(NODES, EDGES);
    expect(layout.edges).toHaveLength(EDGES.length);
    for (const edge of layout.edges) {
      expect(edge.d).toMatch(/^M [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+$/);
      expect(edge.d).not.toMatch(/[CQHV]/);
    }
  });
});
