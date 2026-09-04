import { describe, expect, it } from 'vitest';
import { buildRoutingGeometry, polylineToPath, routeEdges } from '../components/NetworkGraph/edgeRouting';
import { BALL_OFFSET_Y, BALL_RADIUS, NODE_HEIGHT, NODE_WIDTH, wrapLabel } from '../components/NetworkGraph/layout';
import type { NetworkGraphNodeBox } from '../components/NetworkGraph/types';

// 3 columns x 2 rows, same geometry as the production layout produces
// (column pitch = NODE_WIDTH + 230, row pitch = NODE_HEIGHT + 84)
function makeBoxes(): NetworkGraphNodeBox[] {
  const ids = ['a1', 'b1', 'c1', 'a2', 'b2', 'c2'];
  return ids.map((id, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = col * (NODE_WIDTH + 230);
    const y = row * (NODE_HEIGHT + 84);
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

  it('uses only horizontal and 45° segments (forward routing)', () => {
    for (const edge of routed) {
      for (let i = 1; i < edge.points.length; i++) {
        const dx = Math.abs(edge.points[i].x - edge.points[i - 1].x);
        const dy = Math.abs(edge.points[i].y - edge.points[i - 1].y);
        const isHorizontal = dy < 0.01;
        const isDiagonal = Math.abs(dx - dy) < 0.01;
        expect(isHorizontal || isDiagonal, `segment ${i} of ${edge.id}: dx=${dx} dy=${dy}`).toBe(true);
      }
    }
  });

  it('leaves and enters horizontally', () => {
    for (const edge of routed) {
      expect(edge.points[1].y).toBeCloseTo(edge.points[0].y, 5);
      const n = edge.points.length;
      expect(edge.points[n - 1].y).toBeCloseTo(edge.points[n - 2].y, 5);
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
          // a diagonal is either a real bend or the final approach into the ball
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

  it('serializes to an SVG path', () => {
    const straight = routed.find(r => r.id === 'straight')!;
    expect(polylineToPath(straight.points)).toMatch(/^M -?\d+(\.\d+)? -?\d+(\.\d+)?( L -?\d+(\.\d+)? -?\d+(\.\d+)?)+$/);
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
});
