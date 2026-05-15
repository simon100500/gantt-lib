import Link from "next/link";
import PlanFactStressDemo from "@/components/PlanFactStressDemo";

export default function PlanFact100Page() {
  return (
    <main>
      <div className="demo-page">
        <header className="demo-hero">
          <h1>Plan-fact 100-row test</h1>
          <p>
            Dedicated plan-fact page for validating scrolling, selection, fill handle behavior, and daily input on a 100-row dataset.
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
