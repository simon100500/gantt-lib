import Link from "next/link";
import FlowLineStressDemo from "@/components/FlowLineStressDemo";

export default function FlowLinePage() {
  return (
    <main>
      <div className="demo-page">
        <header className="demo-hero">
          <h1>Flow line conveyor · 25 floors × 40 works</h1>
          <p>
            Line-of-balance stress case: 1000 activity bars, invisible chains in two directions —
            sequentially within a floor and the same work across floors. Drag any bar: the whole
            downstream conveyor follows in real time.
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
