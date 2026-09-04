/**
 * Input data for the network graph (работы — вершины, связи — рёбра).
 */
export interface NetworkGraphNode {
  id: string;
  /** Отображаемое название работы */
  label: string;
}

export interface NetworkGraphEdge {
  id?: string;
  source: string;
  target: string;
}

/**
 * Geometry of a laid-out node ("шарик" + подпись).
 * x/y/width/height — габаритный бокс от ELK, ball — геометрия круга.
 */
export interface NetworkGraphNodeBox {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Центр и радиус "шарика" */
  ball: { cx: number; cy: number; r: number };
  /** Строки подписи под шариком */
  labelLines: string[];
}

export interface NetworkGraphEdgePath {
  id: string;
  source: string;
  target: string;
  /** SVG path с изломами под 45° */
  d: string;
}

export interface NetworkGraphLayout {
  nodes: NetworkGraphNodeBox[];
  edges: NetworkGraphEdgePath[];
  width: number;
  height: number;
}

export interface NetworkGraphProps {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
  /** Высота контейнера (px). Ширина — 100% родителя */
  height?: number;
  className?: string;
  onNodeClick?: (node: NetworkGraphNode) => void;
}
