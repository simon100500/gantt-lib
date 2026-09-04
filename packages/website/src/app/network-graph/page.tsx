"use client";

import { useMemo, useState } from "react";
import { NetworkGraph } from "gantt-lib";
import { NETWORK_NODES, NETWORK_EDGES } from "./data";

export default function NetworkGraphPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const hint = useMemo(
    () => (selected ? `Выбрана работа: ${selected}` : "Тяните холст мышью, колесо — зум"),
    [selected]
  );

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

      <NetworkGraph
        nodes={NETWORK_NODES}
        edges={NETWORK_EDGES}
        height={760}
        onNodeClick={(node) => setSelected(node.label)}
      />
    </main>
  );
}
