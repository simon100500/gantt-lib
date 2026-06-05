import Link from "next/link";
import PlanFactStressDemo from "@/components/PlanFactStressDemo";

export default function PlanFact1000Page() {
  return (
    <main>
      <div className="demo-page">
        <header className="demo-hero">
          <h1>Plan-fact 1000-row test</h1>
          <p>
            Dedicated plan-fact page for validating scrolling, selection, fill handle behavior, and daily input on a 1000-row, long-day-period dataset.
          </p>
          <div className="demo-hero-actions">
            <Link className="demo-link-btn demo-link-btn-secondary" href="/">
              Back to main demo
            </Link>
          </div>
        </header>

        <PlanFactStressDemo />
      </div>
    </main>
  );
}
