"use client";

import { useMemo, useState } from "react";
import { NetworkGraph, type NetworkGraphEdge, type NetworkGraphNode } from "gantt-lib";

// Данные с референса: работы — вершины, связи — рёбра.
// «Благоустройство» зависит от первой работы, но стоит в конце фазы —
// layout должен поставить его ближе к концу графа.
const NETWORK_NODES: NetworkGraphNode[] = [
  { id: "z1", label: "Земляные работы I" },
  { id: "z2", label: "Земляные работы II" },
  { id: "f1", label: "Устройство фундаментов I" },
  { id: "f2", label: "Устройство фундаментов II" },
  { id: "m1", label: "Монтаж оборудования I" },
  { id: "m2", label: "Монтаж оборудования II" },
  { id: "el1", label: "Электромонтажные работы I" },
  { id: "el2", label: "Электромонтажные работы II" },
  { id: "os", label: "Общестроительные работы" },
  { id: "ot1", label: "Отделочные работы и полы I" },
  { id: "ot2", label: "Отделочные работы и полы II" },
  { id: "blg", label: "Благоустройство" },
  { id: "nal", label: "Наладка и сдача" },
];

const NETWORK_EDGES: NetworkGraphEdge[] = [
  { source: "z1", target: "z2" },
  { source: "z1", target: "f1" },
  { source: "z2", target: "f2" },
  { source: "z1", target: "blg" },
  { source: "f1", target: "m1" },
  { source: "f1", target: "os" },
  { source: "f2", target: "m2" },
  { source: "m1", target: "el1" },
  { source: "m2", target: "el2" },
  { source: "os", target: "ot1" },
  { source: "el1", target: "ot1" },
  { source: "el2", target: "ot2" },
  { source: "ot1", target: "ot2" },
  { source: "ot1", target: "blg" },
  { source: "blg", target: "nal" },
  { source: "ot2", target: "nal" },
];

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
        <p>Работы — вершины, связи — ломаные под 45°. Позиционирование: elkjs layered, слева направо.</p>
        <p style={{ color: "#6b7280", fontSize: 13 }}>{hint}</p>
      </header>

      <NetworkGraph
        nodes={NETWORK_NODES}
        edges={NETWORK_EDGES}
        height={620}
        onNodeClick={(node) => setSelected(node.label)}
      />
    </main>
  );
}
