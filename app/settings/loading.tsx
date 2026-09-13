import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <div className="shell" aria-busy="true" aria-label="Loading settings">
        <aside className="sidebar" aria-hidden="true">
          <div style={{ height: 60, borderBottom: "1px solid var(--border)" }} />
          <div style={{ padding: 12 }}>
            <Skeleton style={{ height: 40, marginBottom: 8 }} />
            <Skeleton style={{ height: 40, marginBottom: 8 }} />
            <Skeleton style={{ height: 40 }} />
          </div>
        </aside>
        <div className="main-col">
          <div style={{ height: 60, borderBottom: "1px solid var(--border)" }} aria-hidden="true" />
          <main id="main" className="page">
            <Skeleton style={{ height: 180 }} />
            <div className="grid grid-2" style={{ marginTop: 16 }}>
              <Skeleton style={{ height: 220 }} />
              <Skeleton style={{ height: 220 }} />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
