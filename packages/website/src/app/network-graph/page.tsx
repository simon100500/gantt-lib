"use client";

import { useMemo, useState } from "react";
import { NetworkGraph, type NetworkGraphRoutingOptions } from "gantt-lib";
import { NETWORK_NODES, NETWORK_EDGES } from "./data";

export default function NetworkGraphPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [routingOptions, setRoutingOptions] = useState<NetworkGraphRoutingOptions>({
    horizontalSnap: 0.65,
    snapThreshold: 72,
    endpointCurve: 0.7,
  });

  const hint = useMemo(
    () => (selected ? `Выбрана работа: ${selected}` : "Тяните холст мышью, колесо — зум"),
    [selected]
  );

  const updateRoutingOption = (key: keyof NetworkGraphRoutingOptions, value: number) => {
    setRoutingOptions(current => ({ ...current, [key]: value }));
  };

  const resetRoutingOptions = () => {
    setRoutingOptions({ horizontalSnap: 0.65, snapThreshold: 72, endpointCurve: 0.7 });
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

      <section className="network-routing-controls" aria-label="Настройки связей">
        <div className="network-routing-controls-heading">
          <div>
            <p className="network-routing-kicker">Эксперимент с линиями</p>
            <h2>Ритм и горизонтали</h2>
          </div>
          <button type="button" className="network-routing-reset" onClick={resetRoutingOptions}>
            Сбросить
          </button>
        </div>

        <div className="network-routing-sliders">
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
      </section>

      <NetworkGraph
        nodes={NETWORK_NODES}
        edges={NETWORK_EDGES}
        height={760}
        routingOptions={routingOptions}
        onNodeClick={(node) => setSelected(node.label)}
      />
    </main>
  );
}
