import { describe, expect, it } from 'vitest';
import { computeNetworkLayout } from '../components/NetworkGraph/layout';
import { buildRoutingGeometry, routeEdges } from '../components/NetworkGraph/edgeRouting';
import type { NetworkGraphEdge, NetworkGraphNode } from '../components/NetworkGraph/types';

const NODES: NetworkGraphNode[] = [
  { id: 'z1', label: 'a' }, { id: 'z2', label: 'a' }, { id: 'f1', label: 'a' }, { id: 'f2', label: 'a' },
  { id: 'm1', label: 'a' }, { id: 'm2', label: 'a' }, { id: 'el1', label: 'a' }, { id: 'el2', label: 'a' },
  { id: 'os', label: 'a' }, { id: 'ot1', label: 'a' }, { id: 'ot2', label: 'a' }, { id: 'blg', label: 'a' },
  { id: 'nal', label: 'a' },
];
const EDGES: NetworkGraphEdge[] = [
  { source: 'z1', target: 'z2' }, { source: 'z1', target: 'f1' }, { source: 'z2', target: 'f2' },
  { source: 'z1', target: 'blg' }, { source: 'f1', target: 'm1' }, { source: 'f1', target: 'os' },
  { source: 'f2', target: 'm2' }, { source: 'm1', target: 'el1' }, { source: 'm2', target: 'el2' },
  { source: 'os', target: 'ot1' }, { source: 'el1', target: 'ot1' }, { source: 'el2', target: 'ot2' },
  { source: 'ot1', target: 'ot2' }, { source: 'ot1', target: 'blg' }, { source: 'blg', target: 'nal' },
  { source: 'ot2', target: 'nal' },
];

describe('debug', () => {
  it('f1->os route', async () => {
    const layout = await computeNetworkLayout(NODES, EDGES);
    console.log(layout.nodes.map(n => `${n.id}: x=${Math.round(n.x)} y=${Math.round(n.y)}`).join('\n'));
    const routed = routeEdges(buildRoutingGeometry(layout.nodes), EDGES.map((e, i) => ({ id: `e${i}`, ...e })));
    const f1os = routed.find(r => r.source === 'f1' && r.target === 'os');
    console.log('f1->os bends:', f1os!.points.length - 1, JSON.stringify(f1os!.points.map(p => [Math.round(p.x), Math.round(p.y)])));
    expect(true).toBe(true);
  });
});
