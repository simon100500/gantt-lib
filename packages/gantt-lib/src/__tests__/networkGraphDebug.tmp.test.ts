import { describe, expect, it } from 'vitest';
import { computeNetworkLayout } from '../components/NetworkGraph/layout';
import { buildRoutingGeometry, routeEdges, routeQuality } from '../components/NetworkGraph/edgeRouting';
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
  it('dumps layout', async () => {
    const layout = await computeNetworkLayout(NODES, EDGES);
    console.log(layout.nodes.map(n => `${n.id}: x=${Math.round(n.x)} y=${Math.round(n.y)}`).join('\n'));
    const routed = routeEdges(buildRoutingGeometry(layout.nodes), EDGES.map((e, i) => ({ id: `e${i}`, ...e })));
    console.log('quality', routeQuality(routed.map(r => r.points)));
    for (let i = 0; i < routed.length; i++) {
      for (let j = i + 1; j < routed.length; j++) {
        const A = routed[i].points, B = routed[j].points;
        let hit = false;
        for (let s = 1; s < A.length && !hit; s++) for (let u = 1; u < B.length && !hit; u++) {
          const o = (p: any, q: any, r: any) => Math.sign((q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y));
          const o1 = o(A[s - 1], A[s], B[u - 1]), o2 = o(A[s - 1], A[s], B[u]);
          const o3 = o(B[u - 1], B[u], A[s - 1]), o4 = o(B[u - 1], B[u], A[s]);
          if (o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4) hit = true;
        }
        if (hit) {
          console.log(`CROSS ${routed[i].source}->${routed[i].target}:`, JSON.stringify(A.map(p => [Math.round(p.x), Math.round(p.y)])));
          console.log(`    vs ${routed[j].source}->${routed[j].target}:`, JSON.stringify(B.map(p => [Math.round(p.x), Math.round(p.y)])));
        }
      }
    }
    expect(true).toBe(true);
  });
});
