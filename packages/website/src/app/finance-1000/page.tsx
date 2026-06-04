import Link from "next/link";
import FinanceMatrixStressDemo from "@/components/FinanceMatrixStressDemo";

export default function Finance1000Page() {
  return (
    <main>
      <div className="demo-page">
        <header className="demo-hero">
          <h1>1000-row finance matrix test</h1>
          <p>
            Dedicated table-matrix page for validating finance-scale virtualization and fixed-width period columns.
          </p>
          <div className="demo-hero-actions">
            <Link className="demo-link-btn demo-link-btn-secondary" href="/">
              Back to main demo
            </Link>
            <Link className="demo-link-btn demo-link-btn-secondary" href="/perf-1000">
              Open Gantt 1000
            </Link>
          </div>
        </header>

        <FinanceMatrixStressDemo />
      </div>
    </main>
  );
}
