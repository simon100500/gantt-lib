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
  it('aligns the top row into one straight line and starts there', async () => {
    const layout = await computeNetworkLayout(NODES, EDGES);
    const minY = Math.min(...layout.nodes.map(n => n.y));
    const topRow = layout.nodes.filter(n => n.y - minY <= 1);
    // стартовый блок (z1) — в верхнем ряду, и верхний ряд выровнен в одну линию
    expect(topRow.some(n => n.id === 'z1')).toBe(true);
    expect(new Set(topRow.map(n => n.y)).size).toBe(1);
    // стартовый блок — в верхней половине графа (поток сверху вниз вправо)
    const maxY = Math.max(...layout.nodes.map(n => n.y));
    const z1 = layout.nodes.find(n => n.id === 'z1')!;
    expect(z1.y).toBeLessThanOrEqual(maxY / 2);
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
