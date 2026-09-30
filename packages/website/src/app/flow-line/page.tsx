import Link from "next/link";
import FlowLineStressDemo from "@/components/FlowLineStressDemo";

export default function FlowLinePage() {
  return (
    <main>
      <div className="demo-page">
        <header className="demo-hero">
          <h1>Flow line conveyor · 5 sections × 25 floors × 40 works</h1>
          <p>
            Line-of-balance stress case: 5000 activity bars across 125 rows (Корпус → 5 Секций →
            25 Этажей). Invisible chains in two directions — sequentially within a floor and the
            same work across floors, locked inside a section (the flow does not cross section
            boundaries). Drag any bar: the whole downstream conveyor of that section follows in
            real time.
          </p>
          <div className="demo-hero-actions">
            <Link className="demo-link-btn demo-link-btn-secondary" href="/">
              Back to main demo
            </Link>
          </div>
        </header>

        <FlowLineStressDemo />
      </div>
    </main>
  );
}
