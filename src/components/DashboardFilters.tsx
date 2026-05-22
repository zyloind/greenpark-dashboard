import { useSpreadsheet } from "@/lib/spreadsheet";
import { ALL_PROJECTS, useProjectOptions } from "@/lib/projects";
import { Link2Off } from "lucide-react";
import { useEffect } from "react";

const periods: string[] = ["Tahun 2024", "Tahun 2025", "Tahun 2026"];
const DEFAULT_PERIOD = "Tahun 2026";

export function DashboardFilters({ scope = "sales" }: { scope?: "sales" | "teknik" }) {
  const { filters, setFilter } = useSpreadsheet();
  const { options, connected } = useProjectOptions(scope);

  useEffect(() => {
    if (connected && filters.project !== ALL_PROJECTS && !options.includes(filters.project)) {
      setFilter("project", ALL_PROJECTS);
    }
  }, [connected, options, filters.project, setFilter]);

  useEffect(() => {
    if (!periods.includes(filters.period)) setFilter("period", DEFAULT_PERIOD);
  }, [filters.period, setFilter]);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <ProjectSelect
        value={filters.project}
        options={options}
        onChange={(v) => setFilter("project", v)}
        connected={connected}
      />
      <Select label="Periode" value={filters.period} options={periods} onChange={(v) => setFilter("period", v)} />
    </div>
  );
}

function ProjectSelect({
  value, options, onChange, connected,
}: {
  value: string; options: string[]; onChange: (v: string) => void; connected: boolean;
}) {
  if (!connected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        <Link2Off className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Pilih Proyek:</span>
        <span className="text-sm font-semibold opacity-70">Upload file dashboard...</span>
      </div>
    );
  }
  return (
    <label className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
      <span className="text-xs font-medium text-muted-foreground">Pilih Proyek:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm font-semibold text-foreground focus:outline-none"
      >
        {options.map((o) => (<option key={o} value={o} className="bg-popover">{o}</option>))}
      </select>
      {options.length > 1 && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {options.length - 1}
        </span>
      )}
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm font-semibold text-foreground focus:outline-none"
      >
        {options.map((o) => <option key={o} value={o} className="bg-popover">{o}</option>)}
      </select>
    </label>
  );
}
