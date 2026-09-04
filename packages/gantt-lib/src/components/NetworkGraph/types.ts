/**
 * Input data for the network graph (работы — вершины, связи — рёбра).
 */
export interface NetworkGraphNode {
  id: string;
  /** Отображаемое название работы */
  label: string;
  /**
   * Плановая дата начала работы. Если даты есть хотя бы у части вершин,
   * раскладка использует их как мягкую горизонтальную шкалу.
   */
  startDate?: string | Date;
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
  /** SVG path одного прямого соединения между окружностями */
  d: string;
}

export interface NetworkGraphRoutingOptions {
  /** Минимальный вертикальный зазор между соседними вершинами одного слоя, px. */
  rowGap?: number;
  /** Горизонтальный зазор между структурными столбцами, px. */
  columnGap?: number;
  /** Разнос соседних точек веера на окружности, px. */
  fanStep?: number;
  /** Доля дуги окружности, доступная для точек входа/выхода: 0..1. */
  fanArc?: number;
  /** Длина прямого плеча перед началом центрального участка, px. */
  endpointLength?: number;
  /** Сила притяжения центрального участка к горизонтали: 0..1. */
  horizontalSnap?: number;
  /** Максимальный перепад между концами, при котором включается snap, в px. */
  snapThreshold?: number;
  /** Длина плавного захода у окружностей: 0..1. */
  endpointCurve?: number;
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
  routingOptions?: NetworkGraphRoutingOptions;
  /** Начальный масштаб после fit-to-view. 1 — текущий fit, 1.25 — крупнее. */
  initialZoom?: number;
  onNodeClick?: (node: NetworkGraphNode) => void;
}
