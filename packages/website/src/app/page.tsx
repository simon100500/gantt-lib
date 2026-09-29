"use client";

import Link from "next/link";
import ConstructionChart from "@/components/ConstructionChart";
import AdditionalColumnsChart from "@/components/AdditionalColumnsChart";
import FinancePlanMatrixDemo from "@/components/FinancePlanMatrixDemo";
import PlanFactDemo from "@/components/PlanFactDemo";
import ResourcePlannerExample from "@/components/ResourcePlannerExample";
import NoLinksCriticalPathDemo from "@/components/NoLinksCriticalPathDemo";
import GenerationSkeletonDemo from "@/components/GenerationSkeletonDemo";
import CompositeAccordionDemo from "@/components/CompositeAccordionDemo";
import CompositeSegmentsDemo from "@/components/CompositeSegmentsDemo";
import FlowLineDemo from "@/components/FlowLineDemo";

export default function Home() {
  return (
    <main>
      <div className="demo-page">
        <header className="demo-hero">
          <h1>gantt-lib</h1>
          <p>Drag task bars to move or resize. Dependency links, cascade shifting, and expired task highlighting included.</p>
          <div className="demo-hero-actions">
            <code>npm install gantt-lib</code>
            <a className="demo-link-btn demo-link-btn-secondary" href="#gantt-accordion">
              Gantt Accordion
            </a>
            <a className="demo-link-btn demo-link-btn-secondary" href="#gantt-lob">
              Flow line
            </a>
            <Link className="demo-link-btn" href="/perf-1000">
              1000-row stress test
            </Link>
            <Link className="demo-link-btn demo-link-btn-secondary" href="/finance-1000">
              Finance 1000 rows
            </Link>
            <Link className="demo-link-btn demo-link-btn-secondary" href="/plan-fact-1000">
              Plan-fact 1000 rows
            </Link>
          </div>
        </header>

        <ConstructionChart />
        <CompositeAccordionDemo />
        <CompositeSegmentsDemo />
        <FlowLineDemo />
        <AdditionalColumnsChart />
        <FinancePlanMatrixDemo />
        <PlanFactDemo />
        <ResourcePlannerExample />
        <NoLinksCriticalPathDemo />
        <GenerationSkeletonDemo />
      </div>
    </main>
  );
}
