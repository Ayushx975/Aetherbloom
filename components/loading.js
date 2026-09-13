import { Skeleton } from "@/components/ui";

function ShellSkeleton({ label, children }) {
  return (
    <div className="shell" aria-busy="true" aria-label={label}>
      <a className="skip-link" href="#main">Skip to main content</a>
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
        <main id="main" className="page">{children}</main>
      </div>
    </div>
  );
}

export function DashboardLoading() {
  return (
    <ShellSkeleton label="Loading HQ">
      <Skeleton style={{ height: 210, marginBottom: 16 }} />
      <div className="dash">
        <Skeleton style={{ height: 340 }} />
        <Skeleton style={{ height: 340 }} />
      </div>
    </ShellSkeleton>
  );
}

export function VaultLoading() {
  return (
    <ShellSkeleton label="Loading vault">
      <Skeleton style={{ height: 96, marginBottom: 16 }} />
      <div className="vault-grid">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} style={{ height: 300 }} />)}
      </div>
    </ShellSkeleton>
  );
}

export function QuestsLoading() {
  return (
    <ShellSkeleton label="Loading quests">
      <Skeleton style={{ height: 76, marginBottom: 16 }} />
      <Skeleton style={{ height: 150, marginBottom: 16 }} />
      <Skeleton style={{ height: 90, marginBottom: 10 }} />
      <Skeleton style={{ height: 90 }} />
    </ShellSkeleton>
  );
}

export function ProfileLoading() {
  return (
    <ShellSkeleton label="Loading profile">
      <Skeleton style={{ height: 230, marginBottom: 16 }} />
      <div className="dash">
        <Skeleton style={{ height: 300 }} />
        <Skeleton style={{ height: 300 }} />
      </div>
    </ShellSkeleton>
  );
}
