import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Megaphone,
  HardHat,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ViewKey = "sales" | "marketing" | "teknik" | "settings";

const links: { key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "sales", label: "Dashboard Sales", icon: LayoutDashboard },
  { key: "marketing", label: "Dashboard Marketing", icon: Megaphone },
  { key: "teknik", label: "Dashboard Teknik", icon: HardHat },
];

export function Sidebar({
  view,
  setView,
  mobileOpen = false,
  onCloseMobile,
}: {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNav = (v: ViewKey) => {
    setView(v);
    onCloseMobile?.();
  };

  const itemBase =
    "flex w-full items-center rounded-lg py-2.5 text-sm font-medium transition-all";
  const itemIdle =
    "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white";
  const itemActive =
    "bg-slate-900/5 text-slate-900 shadow-sm dark:bg-white/10 dark:text-white";

  const renderNavButton = (
    key: ViewKey | "settings",
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    active: boolean,
    onClick: () => void,
    danger = false,
  ) => {
    const button = (
      <button
        onClick={onClick}
        aria-label={label}
        className={cn(
          itemBase,
          isCollapsed ? "justify-center px-0" : "gap-3 px-3",
          danger
            ? "text-slate-500 hover:bg-destructive/10 hover:text-destructive dark:text-slate-400"
            : active
              ? itemActive
              : itemIdle,
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            !danger && active && "text-[var(--emerald)]",
          )}
        />
        {!isCollapsed && <span className="truncate">{label}</span>}
        {!isCollapsed && active && !danger && (
          <span className="ml-auto h-2 w-2 rounded-full bg-[var(--emerald)]" />
        )}
      </button>
    );

    if (!isCollapsed) return button;
    return (
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          aria-label="Tutup menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={cn(
          "z-50 flex h-full flex-shrink-0 flex-col border-r backdrop-blur-xl transition-all duration-300 ease-in-out",
          "border-slate-200/60 bg-white/80 text-slate-900",
          "dark:border-white/10 dark:bg-slate-900/50 dark:text-white",
          // Mobile: fixed overlay
          "fixed inset-y-0 left-0 w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop
          "md:relative md:translate-x-0",
          isCollapsed ? "md:w-20" : "md:w-64",
        )}
      >
        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          aria-label={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}
          className="absolute -right-3 top-6 z-20 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:text-slate-900 dark:border-white/15 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white md:flex"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Brand */}
        <div
          className={cn(
            "flex items-center gap-3 border-b border-slate-200/60 py-4 dark:border-white/10",
            isCollapsed ? "justify-center px-2" : "px-5",
          )}
        >
          <img
            src="/logo.png"
            alt="Greenpark"
            className="h-8 w-auto shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
                Greenpark
              </span>
              <span className="text-xs font-medium leading-tight text-slate-500 dark:text-slate-400">
                Dashboard
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav aria-label="Navigasi utama" className="flex-1 space-y-1 p-3">
          {!isCollapsed && (
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Menu Utama
            </p>
          )}
          {links.map(({ key, label, icon: Icon }) =>
            <div key={key}>
              {renderNavButton(key, label, Icon, view === key, () => handleNav(key))}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="space-y-2 border-t border-slate-200/60 p-3 dark:border-white/10">
          {renderNavButton(
            "settings",
            "Pengaturan",
            SettingsIcon,
            view === "settings",
            () => handleNav("settings"),
          )}

          {!isCollapsed ? (
            <div className="flex items-center gap-3 rounded-lg bg-slate-900/5 px-3 py-2 dark:bg-white/5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--emerald)]/20 text-xs font-bold text-[var(--emerald)]">
                {user?.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                  {user?.username}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Administrator
                </p>
              </div>
            </div>
          ) : (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[var(--emerald)]/20 text-xs font-bold text-[var(--emerald)]">
                  {user?.username.slice(0, 2).toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{user?.username}</TooltipContent>
            </Tooltip>
          )}

          {renderNavButton("settings", "Logout", LogOut, false, logout, true)}
        </div>
      </aside>
    </TooltipProvider>
  );
}
