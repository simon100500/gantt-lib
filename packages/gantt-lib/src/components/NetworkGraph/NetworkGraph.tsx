'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { NetworkGraphLayout, NetworkGraphProps } from './types';
import { computeNetworkLayout, LABEL_LINE_HEIGHT, LABEL_TOP } from './layout';
import './NetworkGraph.css';

const MIN_SCALE = 0.03;
const MIN_FIT_SCALE = 0.18;
const MAX_SCALE = 4;
const FIT_PADDING = 28;

interface ViewTransform {
  x: number;
  y: number;
  k: number;
}

/**
 * Прототип сетевого графика (графа): работы — вершины-"шарики", связи —
 * прямые отрезки между точками на окружностях. Позиционирование делает elkjs
 * слева направо, точки вееров разводятся по дугам окружностей.
 *
 * Холст можно таскать мышью (grab), колесо — зум к курсору.
 */
export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  edges,
  height = 480,
  className,
  onNodeClick,
}) => {
  const [layout, setLayout] = useState<NetworkGraphLayout | null>(null);
  const [failed, setFailed] = useState(false);
  const [panning, setPanning] = useState(false);
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, k: 1 });

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const panRef = useRef<{ pointerId: number; lastX: number; lastY: number; moved: boolean } | null>(null);
  const draggedRef = useRef(false);

  // Layout is async (elkjs) — recompute when data changes
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    computeNetworkLayout(nodes, edges)
      .then(result => {
        if (!cancelled) setLayout(result);
      })
      .catch(err => {
        console.error('NetworkGraph layout failed', err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [nodes, edges]);

  const fitView = useCallback((result: NetworkGraphLayout) => {
    const el = containerRef.current;
    if (!el || result.width === 0) return;
    const { clientWidth: cw, clientHeight: ch } = el;
    const k = Math.min(
      1,
      Math.max(MIN_FIT_SCALE, Math.min((cw - FIT_PADDING * 2) / result.width, (ch - FIT_PADDING * 2) / result.height))
    );
    const renderedWidth = result.width * k;
    setView({
      // Если весь граф не помещается, начинаем с левого края. При центрировании
      // пользователь получает середину большой схемы и теряет точку старта.
      x: renderedWidth > cw - FIT_PADDING * 2 ? FIT_PADDING : (cw - renderedWidth) / 2,
      y: (ch - result.height * k) / 2,
      k,
    });
  }, []);

  // Center/fit the graph whenever a new layout arrives
  useEffect(() => {
    if (layout) fitView(layout);
  }, [layout, fitView]);

  // Wheel zoom is attached natively: React's onWheel is passive and cannot preventDefault.
  // Re-attached when the SVG appears (layout is async, svgRef is null before that).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const factor = Math.exp(-event.deltaY * 0.0015);
      setView(v => {
        const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.k * factor));
        const scale = k / v.k;
        return { k, x: px - (px - v.x) * scale, y: py - (py - v.y) * scale };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [layout]);

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    panRef.current = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY, moved: false };
    setPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const dx = event.clientX - pan.lastX;
    const dy = event.clientY - pan.lastY;
    if (!pan.moved && Math.hypot(dx, dy) > 3) pan.moved = true;
    pan.lastX = event.clientX;
    pan.lastY = event.clientY;
    setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    draggedRef.current = pan.moved;
    panRef.current = null;
    setPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleNodeClick = (nodeId: string) => {
    if (draggedRef.current) return;
    const node = nodes.find(n => n.id === nodeId);
    if (node) onNodeClick?.(node);
  };

  if (failed) {
    return (
      <div className={`network-graph network-graph-failed ${className ?? ''}`} style={{ height }}>
        Не удалось построить граф (проверьте связи на циклы)
      </div>
    );
  }

  if (!layout) {
    return (
      <div className={`network-graph network-graph-loading ${className ?? ''}`} style={{ height }}>
        Построение графа…
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`network-graph ${className ?? ''}`} style={{ height }}>
      <svg
        ref={svgRef}
        className={`network-graph-svg${panning ? ' network-graph-panning' : ''}`}
        data-testid="network-graph-svg"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <marker
            id="network-graph-arrow"
            markerWidth="9"
            markerHeight="8"
            markerUnits="userSpaceOnUse"
            refX="8"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 9 4, 0 8" fill="var(--network-graph-edge-color, #64748b)" />
          </marker>
        </defs>

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {layout.edges.map(edge => (
            <path
              key={edge.id}
              className="network-graph-edge"
              data-testid={`network-graph-edge-${edge.id}`}
              d={edge.d}
              markerEnd="url(#network-graph-arrow)"
            />
          ))}

          {layout.nodes.map(node => (
            <g
              key={node.id}
              className="network-graph-node"
              data-testid={`network-graph-node-${node.id}`}
              onClick={() => handleNodeClick(node.id)}
            >
              <circle
                className="network-graph-ball"
                cx={node.ball.cx}
                cy={node.ball.cy}
                r={node.ball.r}
              />
              {node.labelLines.map((line, i) => (
                <text
                  key={i}
                  className="network-graph-label"
                  x={node.ball.cx}
                  y={node.y + LABEL_TOP + (i + 1) * LABEL_LINE_HEIGHT - 3}
                  textAnchor="middle"
                >
                  {line}
                </text>
              ))}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

NetworkGraph.displayName = 'NetworkGraph';

export default NetworkGraph;
