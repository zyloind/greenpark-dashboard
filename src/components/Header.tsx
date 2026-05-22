import { useState } from "react";
import { Bell, LogOut, Menu, Moon, Search, Shield, Sparkles, Sun, User as UserIcon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const notifications = [
  { icon: "✅", title: "Data berhasil disinkronisasi", time: "Baru saja", tone: "emerald" },
  { icon: "⚠️", title: "Evaluasi Deviasi Proyek Teknik", time: "5 menit lalu", tone: "amber" },
  { icon: "📊", title: "Laporan mingguan Sales siap ditinjau", time: "1 jam lalu", tone: "electric" },
];
export function Header({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void } = {}) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [aiOpen, setAiOpen] = useState(false);
  const initials = user?.username.slice(0, 2).toUpperCase() ?? "AD";

  return (
    <header className="glass sticky top-0 z-20 flex w-full items-center justify-between gap-3 rounded-none border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
      {/* Mobile hamburger */}
      <button
        onClick={onOpenMobileMenu}
        aria-label="Buka menu"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black/5 bg-white/70 text-slate-700 backdrop-blur-xl transition hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden max-w-xl flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari proyek, vendor, atau metrik..."
          className="h-11 w-full rounded-lg border bg-input/50 pl-9 pr-4 text-sm placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3 md:gap-4">



      {/* AI Insight Modal */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogTrigger asChild>
          <button className="group relative hidden sm:inline-flex items-center gap-2 overflow-hidden rounded-lg border border-[var(--electric)]/40 bg-gradient-to-r from-[var(--electric)]/15 via-primary/10 to-[var(--electric)]/15 px-4 py-2 text-sm font-semibold text-foreground transition-all min-h-11 hover:border-[var(--electric)]/70 hover:shadow-lg hover:shadow-[var(--electric)]/20">
            <Sparkles className="h-4 w-4 text-[var(--electric)] transition-transform group-hover:rotate-12" />
            Get AI Insight
          </button>
        </DialogTrigger>
        <DialogContent className="glass max-w-md border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-[var(--electric)]" />
              AI Insight Analytics
            </DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              Fitur AI Insight sedang dalam tahap pengembangan dan akan segera tersedia untuk
              menganalisis data Anda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAiOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="hidden h-11 w-11 items-center justify-center rounded-lg border border-black/5 bg-white/70 text-slate-700 backdrop-blur-xl transition-all hover:border-primary/40 hover:text-foreground sm:flex dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
        aria-label="Ganti tema"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>


      {/* Notifications Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="Notifikasi"
            className="relative hidden sm:flex h-11 w-11 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-all hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="glass w-80 border-white/10 p-0">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold">Notifikasi</p>
            <p className="text-[11px] text-muted-foreground">{notifications.length} update terbaru</p>
          </div>
          <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
            {notifications.map((n, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3 transition hover:bg-white/5">
                <span className="text-lg leading-none">{n.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{n.title}</p>
                  <p className="text-[10px] text-muted-foreground">{n.time}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-white/10 px-4 py-2 text-center">
            <button className="text-[11px] font-semibold text-[var(--electric)] hover:underline">
              Tandai semua dibaca
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Profile Avatar Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--emerald)]/40 bg-[var(--emerald)]/15 text-xs font-bold text-[var(--emerald)] transition-all hover:border-[var(--emerald)]/70 hover:shadow-md hover:shadow-[var(--emerald)]/20"
            aria-label="Profil pengguna"
          >
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass w-64 border-white/10">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--emerald)]/30 to-[var(--electric)]/30 text-sm font-bold text-foreground ring-2 ring-[var(--emerald)]/40">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Administrator</p>
              <p className="truncate text-[11px] text-muted-foreground">{user?.username ?? "admin.dashboard"}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2 text-[11px] font-normal text-muted-foreground">
            <Shield className="h-3 w-3 text-[var(--emerald)]" />
            Role
          </DropdownMenuLabel>
          <DropdownMenuItem className="cursor-default focus:bg-transparent">
            <span className="text-xs font-semibold text-foreground">Management / Super Admin</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserIcon className="mr-2 h-4 w-4" />
            Detail Akun
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={logout}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}

