import { describe, expect, it } from 'vitest';
import {
  buildRoutingGeometry,
  polylineToPath,
  routeDirectConnections,
  routeEdges,
} from '../components/NetworkGraph/edgeRouting';
import { BALL_OFFSET_Y, BALL_RADIUS, NODE_HEIGHT, NODE_WIDTH, wrapLabel } from '../components/NetworkGraph/layout';
import type { NetworkGraphNodeBox } from '../components/NetworkGraph/types';

// 3 columns x 2 rows, same geometry as the production layout produces
// (column pitch = NODE_WIDTH + 240, row pitch = NODE_HEIGHT + 40)
function makeBoxes(): NetworkGraphNodeBox[] {
  const ids = ['a1', 'b1', 'c1', 'a2', 'b2', 'c2'];
  return ids.map((id, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = col * (NODE_WIDTH + 240);
    const y = row * (NODE_HEIGHT + 40);
    return {
      id,
      label: id,
      x,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      ball: { cx: x + NODE_WIDTH / 2, cy: y + BALL_OFFSET_Y, r: BALL_RADIUS },
      labelLines: [id],
    };
  });
}

const geometry = buildRoutingGeometry(makeBoxes());

interface Pt {
  x: number;
  y: number;
}

function orientation(p: Pt, q: Pt, r: Pt): number {
  const v = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  return Math.abs(v) < 1e-9 ? 0 : v > 0 ? 1 : 2;
}

function segmentsIntersect(p1: Pt, p2: Pt, q1: Pt, q2: Pt): boolean {
  const o1 = orientation(p1, p2, q1);
  const o2 = orientation(p1, p2, q2);
  const o3 = orientation(q1, q2, p1);
  const o4 = orientation(q1, q2, p2);
  return o1 !== o2 && o3 !== o4;
}

describe('buildRoutingGeometry', () => {
  it('clusters boxes into columns left-to-right', () => {
    expect(geometry.columns).toHaveLength(3);
    expect(geometry.windows).toHaveLength(2);
    expect(geometry.windows[0].width).toBeGreaterThan(0);
    expect(geometry.windows[1].width).toBeGreaterThan(0);
  });

  it('places a corridor lane between the two rows', () => {
    expect(geometry.corridorLanes).toHaveLength(1);
    const [lane] = geometry.corridorLanes;
    const boxes = makeBoxes();
    const firstRowBottom = Math.max(...boxes.filter(b => b.y === 0).map(b => b.y + b.height));
    const secondRowTop = Math.min(...boxes.filter(b => b.y > 0).map(b => b.y));
    expect(lane).toBeGreaterThan(firstRowBottom);
    expect(lane).toBeLessThan(secondRowTop);
  });
});

describe('routeEdges', () => {
  const cases = [
    { id: 'straight', source: 'a1', target: 'b1' }, // same row
    { id: 'down', source: 'a1', target: 'b2' }, // one row down
    { id: 'up', source: 'a2', target: 'b1' }, // one row up
    { id: 'far', source: 'a1', target: 'c2' }, // two rows down through a column
    { id: 'same-row-far', source: 'a1', target: 'c1' },
  ];

  const routed = routeEdges(geometry, cases);

  it('routes every valid edge', () => {
    expect(routed).toHaveLength(cases.length);
    routed.forEach(r => expect(r.fallback).toBe(false));
  });

  it('attaches edges to the ball arcs', () => {
    for (const edge of routed) {
      const s = geometry.boxById.get(edge.source)!.ball;
      const t = geometry.boxById.get(edge.target)!.ball;
      const first = edge.points[0];
      const last = edge.points[edge.points.length - 1];
      expect(Math.hypot(first.x - s.cx, first.y - s.cy)).toBeCloseTo(s.r, 5);
      expect(Math.hypot(last.x - t.cx, last.y - t.cy)).toBeCloseTo(t.r, 5);
    }
  });

  it('keeps forward routes monotonic without requiring a 45° grid', () => {
    for (const edge of routed) {
      for (let i = 1; i < edge.points.length; i++) {
        const dx = Math.abs(edge.points[i].x - edge.points[i - 1].x);
        const dy = Math.abs(edge.points[i].y - edge.points[i - 1].y);
        expect(edge.points[i].x).toBeGreaterThanOrEqual(edge.points[i - 1].x - 0.01);
        if (dx + dy < 0.01) continue;
      }
    }
  });

  it('enters the target ball on its left side', () => {
    for (const edge of routed) {
      const t = geometry.boxById.get(edge.target)!.ball;
      const last = edge.points[edge.points.length - 1];
      expect(last.x).toBeLessThan(t.cx);
      expect(Math.abs(last.y - t.cy)).toBeLessThanOrEqual(t.r);
    }
  });

  it('runs the straight edge as a single segment', () => {
    const straight = routed.find(r => r.id === 'straight')!;
    expect(straight.points).toHaveLength(2);
  });

  it('never runs a horizontal segment through a foreign node box', () => {
    const boxes = makeBoxes();
    for (const edge of routed) {
      const foreign = boxes.filter(b => b.id !== edge.source && b.id !== edge.target);
      for (let i = 1; i < edge.points.length; i++) {
        const p0 = edge.points[i - 1];
        const p1 = edge.points[i];
        if (Math.abs(p0.y - p1.y) > 0.01) continue; // diagonal segments live between columns
        const y = p0.y;
        const x1 = Math.min(p0.x, p1.x);
        const x2 = Math.max(p0.x, p1.x);
        for (const b of foreign) {
          const crossesLane = y > b.y + 1 && y < b.y + b.height - 1;
          const crossesX = x2 > b.x + 1 && x1 < b.x + b.width - 1;
          expect(crossesLane && crossesX, `edge ${edge.id} segment ${i} runs through box ${b.id}`).toBe(false);
        }
      }
    }
  });

  it('never draws tiny kink diagonals (all bends are meaningful)', () => {
    for (const edge of routed) {
      for (let i = 1; i < edge.points.length; i++) {
        const dx = Math.abs(edge.points[i].x - edge.points[i - 1].x);
        const dy = Math.abs(edge.points[i].y - edge.points[i - 1].y);
        const isDiagonal = Math.abs(dx - dy) < 0.01;
        if (isDiagonal) {
          // A diagonal is either a real bend or the final approach into the ball.
          const isFinalApproach = i === edge.points.length - 1;
          const isInitialDeparture = i === 2 && edge.points.length > 3;
          expect(
            Math.min(dx, dy) >= 16 || isFinalApproach || isInitialDeparture,
            `edge ${edge.id} segment ${i} is a kink (dx=${dx})`
          ).toBe(true);
        }
      }
    }
  });

  it('long sibling edge sweeps past the sibling landing row without crossing it', () => {
    // a1 -> b1 descends directly; a1 -> c2 must sweep BELOW row B (nested fan)
    const pair = routeEdges(geometry, [
      { id: 'direct', source: 'a1', target: 'b1' },
      { id: 'sweep', source: 'a1', target: 'c2' },
    ]);
    const direct = pair.find(r => r.id === 'direct')!;
    const sweep = pair.find(r => r.id === 'sweep')!;

    const longRunY = sweep.points[2].y; // lane after the first diagonal
    expect(longRunY).toBeGreaterThan(geometry.boxById.get('b1')!.ball.cy);

    // no segment intersections between the two sibling paths
    const crosses = (a: Pt[], b: Pt[]) => {
      for (let i = 1; i < a.length; i++) {
        for (let j = 1; j < b.length; j++) {
          if (segmentsIntersect(a[i - 1], a[i], b[j - 1], b[j])) return true;
        }
      }
      return false;
    };
    expect(crosses(direct.points, sweep.points), 'sibling edges must not cross').toBe(false);
  });

  it('serializes to an SVG path', () => {
    const straight = routed.find(r => r.id === 'straight')!;
    expect(polylineToPath(straight.points)).toMatch(/^M -?\d+(\.\d+)? -?\d+(\.\d+)?( L -?\d+(\.\d+)? -?\d+(\.\d+)?)+$/);
  });
});

describe('routeDirectConnections', () => {
  const curves = routeDirectConnections(geometry, [
    { id: 'upper-out', source: 'a1', target: 'b1' },
    { id: 'lower-out', source: 'a1', target: 'b2' },
    { id: 'lower-in', source: 'a2', target: 'b1' },
  ]);

  it('draws every connection as one straight segment', () => {
    expect(curves).toHaveLength(3);
    for (const edge of curves) {
      expect(edge.d).toMatch(/^M [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+$/);
      expect(edge.d).not.toMatch(/[CQHV]/);
    }
  });

  it('attaches curves to the circle arcs', () => {
    for (const edge of curves) {
      const source = geometry.boxById.get(edge.source)!.ball;
      const target = geometry.boxById.get(edge.target)!.ball;
      expect(Math.hypot(edge.start.x - source.cx, edge.start.y - source.cy)).toBeCloseTo(source.r, 5);
      expect(Math.hypot(edge.end.x - target.cx, edge.end.y - target.cy)).toBeCloseTo(target.r, 5);
    }
  });

  it('orders fan anchors by the opposite node position', () => {
    const upperOut = curves.find(edge => edge.id === 'upper-out')!;
    const lowerOut = curves.find(edge => edge.id === 'lower-out')!;
    const lowerIn = curves.find(edge => edge.id === 'lower-in')!;
    expect(upperOut.start.y).toBeLessThan(lowerOut.start.y);
    expect(upperOut.end.y).toBeLessThan(lowerIn.end.y);
  });

  it('keeps an isolated same-row connection straight', () => {
    const [edge] = routeDirectConnections(geometry, [
      { id: 'same-row', source: 'a1', target: 'b1' },
    ]);
    expect(edge.d).toMatch(/^M [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+$/);
  });
});

describe('wrapLabel', () => {
  it('wraps long labels into several lines', () => {
    const lines = wrapLabel('Электромонтажные работы I');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe('Электромонтажные работы I');
  });

  it('keeps short labels on one line', () => {
    expect(wrapLabel('Наладка')).toEqual(['Наладка']);
  });

  it('keeps the complete label without an ellipsis', () => {
    const label = 'Очень длинное название работы без сокращения';
    const lines = wrapLabel(label);
    expect(lines.join(' ')).toBe(label);
    expect(lines.join('')).not.toContain('…');
  });

  it('breaks an overlong word without dropping characters', () => {
    const label = 'Сверхдлинноесловобезпробелов';
    expect(wrapLabel(label).join('')).toBe(label);
  });
});
