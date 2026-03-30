"use client";

import ConstructionChart from "@/components/ConstructionChart";
import AdditionalColumnsChart from "@/components/AdditionalColumnsChart";

export default function Home() {
  return (
    <main>
      <div className="demo-page">
        <header className="demo-hero">
          <h1>gantt-lib</h1>
          <p>Drag task bars to move or resize. Dependency links, cascade shifting, and expired task highlighting included.</p>
          <code>npm install gantt-lib</code>
        </header>

        <ConstructionChart />
        <AdditionalColumnsChart />
      </div>
    </main>
  );
}
