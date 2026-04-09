import { useSnapshot } from "valtio";
import { Sidebar, MobileNav } from "./Sidebar";
import { PageHeader } from "./PageHeader";
import { SettingsSidebar } from "../ui/SettingsPanel";
import { settingsStore } from "../../stores/settingsStore";

export function AppShell({ children }) {
  const settingsSnap = useSnapshot(settingsStore);

  return (
    <div
      className="w-full h-full flex flex-col md:flex-row"
      style={{ background: "var(--surface-0)" }}
    >
      {/* Desktop sidebar */}
      <div className="sidebar-desktop">
        <Sidebar />
      </div>

      <main
        className="flex-1 min-w-0 flex flex-col h-full overflow-hidden"
        style={{ background: "transparent" }}
      >
        <PageHeader />
        {children}
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />

      <SettingsSidebar
        open={settingsSnap.panelOpen}
        onClose={() => { settingsStore.panelOpen = false; }}
      />
    </div>
  );
}
