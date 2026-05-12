"use client";

import Link from "next/link";
import ConstructionChart from "@/components/ConstructionChart";
import AdditionalColumnsChart from "@/components/AdditionalColumnsChart";
import FinancePlanMatrixDemo from "@/components/FinancePlanMatrixDemo";
import ResourcePlannerExample from "@/components/ResourcePlannerExample";

export default function Home() {
  return (
    <main>
      <div className="demo-page">
        <header className="demo-hero">
          <h1>gantt-lib</h1>
          <p>Drag task bars to move or resize. Dependency links, cascade shifting, and expired task highlighting included.</p>
          <div className="demo-hero-actions">
            <code>npm install gantt-lib</code>
            <Link className="demo-link-btn" href="/perf-1000">
              1000-row stress test
            </Link>
          </div>
        </header>

        <ConstructionChart />
        <AdditionalColumnsChart />
        <FinancePlanMatrixDemo />
        <ResourcePlannerExample />
      </div>
    </main>
  );
}
