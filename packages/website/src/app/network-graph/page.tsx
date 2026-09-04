"use client";

import { useMemo, useState } from "react";
import { NetworkGraph, type NetworkGraphRoutingOptions } from "gantt-lib";
import { NETWORK_NODES, NETWORK_EDGES } from "./data";

const DEFAULT_ROUTING_OPTIONS: Required<NetworkGraphRoutingOptions> = {
  rowGap: 54,
  columnGap: 108,
  fanStep: 26,
  fanArc: 0.72,
  endpointLength: 44,
  horizontalSnap: 0.65,
  snapThreshold: 72,
  endpointCurve: 0.7,
};

export default function NetworkGraphPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [routingOptions, setRoutingOptions] = useState<NetworkGraphRoutingOptions>(DEFAULT_ROUTING_OPTIONS);

  const hint = useMemo(
    () => (selected ? `Выбрана работа: ${selected}` : "Тяните холст мышью, колесо — зум"),
    [selected]
  );

  const updateRoutingOption = (key: keyof NetworkGraphRoutingOptions, value: number) => {
    setRoutingOptions(current => ({ ...current, [key]: value }));
  };

  const resetRoutingOptions = () => {
    setRoutingOptions(DEFAULT_ROUTING_OPTIONS);
  };

  return (
    <main className="demo-page">
      <header className="demo-hero">
        <h1>Сетевой график (прототип)</h1>
        <p>
          Реальный проект: <strong>{NETWORK_NODES.length} работ, {NETWORK_EDGES.length} связей</strong>.
          Прямые связи, позиционирование elkjs layered слева направо.
        </p>
        <p style={{ color: "#6b7280", fontSize: 13 }}>{hint}</p>
      </header>

      <div className="network-graph-workspace">
        <aside className="network-routing-controls" aria-label="Настройки связей">
        <div className="network-routing-controls-heading">
          <div>
            <p className="network-routing-kicker">Эксперимент с линиями</p>
            <h2>Ритм и горизонтали</h2>
          </div>
          <button type="button" className="network-routing-reset" onClick={resetRoutingOptions}>
            Сбросить
          </button>
        </div>

        <div className="network-routing-group">
          <p className="network-routing-group-title">Сетка графа</p>
          <label className="network-routing-slider" htmlFor="network-row-gap">
            <span><span>Строки</span><output>{routingOptions.rowGap ?? 0} px</output></span>
            <input id="network-row-gap" type="range" min="20" max="120" step="2" value={routingOptions.rowGap ?? 54} onChange={event => updateRoutingOption("rowGap", Number(event.target.value))} />
            <small>Вертикальный зазор между вершинами</small>
          </label>
          <label className="network-routing-slider" htmlFor="network-column-gap">
            <span><span>Столбцы</span><output>{routingOptions.columnGap ?? 108} px</output></span>
            <input id="network-column-gap" type="range" min="40" max="240" step="4" value={routingOptions.columnGap ?? 108} onChange={event => updateRoutingOption("columnGap", Number(event.target.value))} />
            <small>Горизонтальный зазор между колонками</small>
          </label>
        </div>

        <div className="network-routing-group">
          <p className="network-routing-group-title">Точки входа и выхода</p>
          <label className="network-routing-slider" htmlFor="network-fan-step">
            <span><span>Разнос веера</span><output>{routingOptions.fanStep ?? 26} px</output></span>
            <input id="network-fan-step" type="range" min="8" max="44" step="2" value={routingOptions.fanStep ?? 26} onChange={event => updateRoutingOption("fanStep", Number(event.target.value))} />
            <small>Минимальный шаг соседних связей</small>
          </label>
          <label className="network-routing-slider" htmlFor="network-fan-arc">
            <span><span>Дуга точки</span><output>{Math.round((routingOptions.fanArc ?? 0) * 100)}%</output></span>
            <input id="network-fan-arc" type="range" min="35" max="95" value={Math.round((routingOptions.fanArc ?? 0.72) * 100)} onChange={event => updateRoutingOption("fanArc", Number(event.target.value) / 100)} />
            <small>Доступная дуга окружности у узла</small>
          </label>
          <label className="network-routing-slider" htmlFor="network-endpoint-length">
            <span><span>Плечо входа</span><output>{routingOptions.endpointLength ?? 44} px</output></span>
            <input id="network-endpoint-length" type="range" min="0" max="90" step="2" value={routingOptions.endpointLength ?? 44} onChange={event => updateRoutingOption("endpointLength", Number(event.target.value))} />
            <small>Длина участка до горизонтали</small>
          </label>
        </div>

        <div className="network-routing-group">
          <p className="network-routing-group-title">Поведение линии</p>
          <label className="network-routing-slider" htmlFor="network-snap-strength">
            <span>
              <span>Привязка к горизонтали</span>
              <output>{Math.round((routingOptions.horizontalSnap ?? 0) * 100)}%</output>
            </span>
            <input
              id="network-snap-strength"
              type="range"
              min="0"
              max="100"
              value={Math.round((routingOptions.horizontalSnap ?? 0) * 100)}
              onChange={event => updateRoutingOption("horizontalSnap", Number(event.target.value) / 100)}
            />
            <small>Сила выравнивания длинного участка</small>
          </label>

          <label className="network-routing-slider" htmlFor="network-snap-threshold">
            <span>
              <span>Чувствительность snap</span>
              <output>{routingOptions.snapThreshold ?? 0} px</output>
            </span>
            <input
              id="network-snap-threshold"
              type="range"
              min="0"
              max="180"
              step="4"
              value={routingOptions.snapThreshold ?? 0}
              onChange={event => updateRoutingOption("snapThreshold", Number(event.target.value))}
            />
            <small>Максимальный перепад высоты для привязки</small>
          </label>

          <label className="network-routing-slider" htmlFor="network-endpoint-curve">
            <span>
              <span>Заход Безье у узлов</span>
              <output>{Math.round((routingOptions.endpointCurve ?? 0) * 100)}%</output>
            </span>
            <input
              id="network-endpoint-curve"
              type="range"
              min="0"
              max="100"
              value={Math.round((routingOptions.endpointCurve ?? 0) * 100)}
              onChange={event => updateRoutingOption("endpointCurve", Number(event.target.value) / 100)}
            />
            <small>Плавность только в местах входа и выхода</small>
          </label>
        </div>
        </aside>

        <NetworkGraph
          nodes={NETWORK_NODES}
          edges={NETWORK_EDGES}
          height={760}
          initialZoom={1.3}
          routingOptions={routingOptions}
          onNodeClick={(node) => setSelected(node.label)}
        />
      </div>
    </main>
  );
}
