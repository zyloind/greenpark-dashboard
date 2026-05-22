import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { SpreadsheetProvider } from "@/lib/spreadsheet";
import { LoginScreen } from "@/components/LoginScreen";
import { Sidebar, type ViewKey } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { SalesDashboard } from "@/components/dashboards/SalesDashboard";
import { MarketingDashboard } from "@/components/dashboards/MarketingDashboard";
import { TeknikDashboard } from "@/components/dashboards/TeknikDashboard";
import { SettingsView } from "@/components/dashboards/SettingsView";

export const Route = createFileRoute("/")({
  component: () => (
    <ThemeProvider>
      <AuthProvider>
        <SpreadsheetProvider>
          <AppGate />
        </SpreadsheetProvider>
      </AuthProvider>
    </ThemeProvider>
  ),
});

function AppGate() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Memuat...</div>;
  if (!user) return <LoginScreen />;
  return <Shell />;
}

function Shell() {
  const [view, setView] = useState<ViewKey>("sales");
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-[#0a0d1a] dark:text-white">
      <AmbientBackdrop />
      <Sidebar view={view} setView={setView} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <main className="relative z-10 flex h-full flex-1 flex-col overflow-y-auto scrollbar-thin">
        <Header onOpenMobileMenu={() => setMobileOpen(true)} />
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {view === "sales" && <SalesDashboard />}
          {view === "marketing" && <MarketingDashboard />}
          {view === "teknik" && <TeknikDashboard />}
          {view === "settings" && <SettingsView />}
        </div>
      </main>
    </div>
  );
}


function AmbientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(80,60,180,0.15),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.1),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(80,60,180,0.25),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.18),transparent_50%)]" />
      <div className="orb orb-float left-[-10%] top-[-10%] h-[520px] w-[520px] bg-gradient-to-tr from-purple-600/40 via-fuchsia-500/30 to-blue-500/30" />
      <div className="orb orb-float-slow right-[-8%] top-[20%] h-[480px] w-[480px] bg-gradient-to-tr from-blue-500/30 via-cyan-400/30 to-emerald-500/30" />
      <div className="orb orb-float bottom-[-12%] left-[30%] h-[600px] w-[600px] bg-gradient-to-tr from-emerald-500/30 via-teal-400/20 to-violet-500/30" />
    </div>
  );
}

