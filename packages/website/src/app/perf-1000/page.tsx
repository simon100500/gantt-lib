import Link from "next/link";
import LargeDatasetDemo from "@/components/LargeDatasetDemo";

export default function Perf1000Page() {
  return (
    <main>
      <div className="demo-page">
        <header className="demo-hero">
          <h1>1000-row performance test</h1>
          <p>
            Dedicated large-dataset page for validating virtualization, scroll stability, and drag behavior on weak machines.
          </p>
          <div className="demo-hero-actions">
            <Link className="demo-link-btn demo-link-btn-secondary" href="/">
              Back to main demo
            </Link>
          </div>
        </header>

        <LargeDatasetDemo />
      </div>
    </main>
  );
}
