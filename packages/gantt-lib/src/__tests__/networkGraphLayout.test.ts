import { describe, expect, it } from 'vitest';
import { computeNetworkLayout } from '../components/NetworkGraph/layout';
import { buildRoutingGeometry, routeEdges, routeQuality } from '../components/NetworkGraph/edgeRouting';
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

  it('routes the demo graph with zero crossings', async () => {
    const layout = await computeNetworkLayout(NODES, EDGES);
    const routed = routeEdges(
      buildRoutingGeometry(layout.nodes),
      EDGES.map((e, i) => ({ id: `e${i}`, source: e.source, target: e.target }))
    );
    const q = routeQuality(routed.map(r => r.points));
    expect(q.crossings).toBe(0);
  });
});
