import { MetricCard } from "@/components/MetricCard";
import { ChartContainer } from "@/components/ChartContainer";
import { EmptyDataBanner } from "@/components/EmptyDataBanner";
import { AIKpiHealthInsight } from "@/components/AIKpiHealthInsight";
import { useSpreadsheet } from "@/lib/spreadsheet";
import { useTeknikData } from "@/lib/teknik";
import { formatIDR } from "@/lib/sales";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Building2, CheckCircle2, Percent, AlertTriangle, Coins, Loader2 } from "lucide-react";

const formatDendaMiliar = (n: number): string => {
  if (!n) return "Rp 0";
  return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
};

export function TeknikDashboard() {
  const { isTeknikConnected } = useSpreadsheet();
  const connected = isTeknikConnected;

  const { kpi, kurva, vendors, contractors, loading } = useTeknikData();
  const isCritical = connected && kpi.avgDeviasi < -10;

  const kurvaData = connected && kurva.length > 0 ? kurva : [];

  const fmtPct = (n: number) => (connected ? `${n.toFixed(1)}%` : "0%");
  const fmtNum = (n: number) => (connected ? n.toLocaleString("id-ID") : "0");

  const worstVendor = vendors.length
    ? [...vendors].sort((a, b) => a.deviasi - b.deviasi)[0]
    : null;
  const teknikStatus: { label: string; tone: "emerald" | "warning" | "danger" } =
    kpi.avgDeviasi < -10 ? { label: "Perlu Intervensi", tone: "danger" }
    : kpi.avgDeviasi >= 0 ? { label: "On Track", tone: "emerald" }
    : { label: "Waspada", tone: "warning" };
  const teknikMessage = `AI Insight: Proyek Teknik saat ini ${teknikStatus.label}. Deviasi rata-rata sebesar ${kpi.avgDeviasi.toFixed(1)}%. Kontraktor ${worstVendor?.name ?? "—"} memerlukan tindak lanjut segera.`;

  return (
    <div>
      <EmptyDataBanner show={!connected} />

      <AIKpiHealthInsight status={teknikStatus} message={teknikMessage} disabled={!connected || loading} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Teknik</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor progres konstruksi, deviasi, dan performa vendor.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          label="Total Unit Active (Stock)"
          value={fmtNum(kpi.unitActive)}
          sub="Unit dalam pembangunan"
          icon={<Building2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Unit Complete (BAST)"
          value={fmtNum(kpi.unitComplete)}
          sub="Sudah serah-terima"
          tone="emerald"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg. Progress Fisik"
          value={fmtPct(kpi.avgProgress)}
          sub="Rata-rata progres"
          tone="electric"
          icon={<Percent className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg. Deviasi"
          value={fmtPct(kpi.avgDeviasi)}
          sub="Target vs realisasi"
          tone="danger"
          highlight={connected && kpi.avgDeviasi < 0 ? "danger" : undefined}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricCard
          label="Total Denda Kontraktor"
          value={connected ? formatDendaMiliar(kpi.totalDenda) : "Rp 0"}
          sub="Akumulasi denda"
          tone="warning"
          icon={<Coins className="h-4 w-4" />}
        />
      </div>

      {isCritical && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-bold text-destructive">⚠️ CRITICAL ALERT TEKNIK</p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/80">
              Deviasi rata-rata proyek konstruksi berada di angka {kpi.avgDeviasi.toFixed(1)}%. Diperlukan percepatan mobilisasi material dan opname vendor segera!
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <ChartContainer
          title="Kurva S Overall"
          description="Target Kumulatif (%) vs Avg Realisasi Kumulatif (%) per minggu / item pekerjaan"
          empty={!connected || kurvaData.length === 0}
          emptyText={
            !connected
              ? "Hubungkan spreadsheet Teknik untuk menampilkan Kurva S."
              : loading
                ? "Memuat KURVA_S_OVERALL…"
                : "Tab KURVA_S_OVERALL tidak ditemukan atau header tidak sesuai."
          }
          height={360}
          action={loading ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Sinkronisasi
            </span>
          ) : null}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={kurvaData}>
              <defs>
                <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={10} angle={-15} textAnchor="end" height={60} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} unit="%" />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="target" name="Target Kumulatif" stroke="var(--color-chart-1)" fill="url(#targetGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="realisasi" name="Realisasi Kumulatif" stroke="var(--color-chart-2)" fill="url(#realGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
          <h3 className="text-sm font-semibold">Tabel Kontraktor</h3>
          <span className="text-[11px] text-muted-foreground">
            {connected ? `${contractors.length} entri` : "—"}
          </span>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Nama Vendor</th>
                <th className="px-3 py-2 text-right font-medium">Jml Proyek</th>
                <th className="px-3 py-2 text-right font-medium">Total Unit</th>
                <th className="px-3 py-2 text-right font-medium">Unit BAST</th>
                <th className="px-3 py-2 text-right font-medium">Kuning &gt;150H</th>
                <th className="px-3 py-2 text-right font-medium">Merah &gt;240H</th>
                <th className="px-3 py-2 text-right font-medium">Avg Deviasi</th>
                <th className="px-3 py-2 text-right font-medium">Total Denda</th>
                <th className="px-3 py-2 text-right font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {!connected || contractors.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-xs text-muted-foreground">—</td>
                </tr>
              ) : (
                contractors.map((v, i) => (
                  <tr key={v.name} className="border-b last:border-0 transition-colors hover:bg-muted/40">
                    <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">{v.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{v.jmlProyek}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{v.totalUnit}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{v.unitBast}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--warning)]">{v.kuning150}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-destructive">{v.merah240}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${v.avgDeviasi < -10 ? "text-destructive" : v.avgDeviasi < 0 ? "text-[var(--warning)]" : "text-foreground"}`}>
                      {v.avgDeviasi.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatIDR(v.totalDenda)}</td>
                    <td className="px-3 py-2.5 text-right">{v.rating || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
