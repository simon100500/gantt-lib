import { describe, expect, it } from 'vitest';
import { computeNetworkLayout } from '../components/NetworkGraph/layout';

const NODES = ['z1', 'z2', 'f1', 'f2', 'm1', 'm2', 'el1', 'el2', 'os', 'ot1', 'ot2', 'blg', 'nal'].map(id => ({ id, label: id }));
const EDGES = [
  ['z1', 'z2'], ['z1', 'f1'], ['z2', 'f2'], ['z1', 'blg'], ['f1', 'm1'], ['f1', 'os'],
  ['f2', 'm2'], ['m1', 'el1'], ['m2', 'el2'], ['os', 'ot1'], ['el1', 'ot1'], ['el2', 'ot2'],
  ['ot1', 'ot2'], ['ot1', 'blg'], ['blg', 'nal'], ['ot2', 'nal'],
].map(([source, target]) => ({ source, target }));

describe('debug', () => {
  it('column gaps', async () => {
    const layout = await computeNetworkLayout(NODES, EDGES);
    const cols = [...new Set(layout.nodes.map(n => Math.round(n.x)))].sort((a, b) => a - b);
    console.log('col x:', cols.join(' -> '));
    console.log('col gaps:', cols.slice(1).map((x, i) => x - cols[i]).join(' -> '));
    console.log('total width:', Math.round(layout.width));
    expect(true).toBe(true);
  });
});
