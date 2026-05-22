import { MetricCard } from "@/components/MetricCard";
import { ChartContainer } from "@/components/ChartContainer";
import { EmptyDataBanner } from "@/components/EmptyDataBanner";
import { useSpreadsheet } from "@/lib/spreadsheet";
import { useSalesData, formatIDRCompact } from "@/lib/sales";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { DollarSign, Users, BadgeCheck, TrendingDown } from "lucide-react";

// --- FUNGSI FORMATTER (DATA SANITIZER SUPER AMAN) ---
const formatChartNominal = (value: any) => {
  // 1. Cek jika value adalah object atau undefined
  if (value === null || value === undefined || typeof value === "object") return "Rp. 0";

  // 2. Paksa konversi ke angka
  const num = typeof value === "string" ? parseFloat(value) : value;

  // 3. Cek NaN
  if (isNaN(num)) return "Rp. 0";

  // 4. Logika format Miliar / Juta
  if (num >= 1000000000) return `Rp. ${Number((num / 1000000000).toFixed(1))} M`;
  if (num >= 1000000) return `Rp. ${Number((num / 1000000).toFixed(1))} Jt`;

  // 5. Jika angka kecil (misal 9, 18) dianggap ribuan
  if (num > 0 && num < 1000) return `Rp. ${(num * 1000).toLocaleString("id-ID")}`;

  // 6. Format standar
  return `Rp. ${num.toLocaleString("id-ID")}`;
};

export function MarketingDashboard() {
  const { isSalesConnected } = useSpreadsheet();
  const connected = isSalesConnected;
  const { marketing, projects, funnel, loading } = useSalesData();
  const live = connected && !loading;

  // Sanitasi Data: Memastikan data projects selalu array
  const safeProjects = Array.isArray(projects) ? projects : [];

  // Memastikan data chart selalu punya nilai numeric
  const roiData = safeProjects.map((p) => ({
    name: p?.name || "Unknown",
    spend: typeof p?.spent === "number" ? p.spent : 0,
    akad: typeof p?.revenue === "number" ? p.revenue : 0,
  }));

  const totalLeads = funnel?.leads || 0;
  const validLeads = funnel?.validLeads || 0;
  const validRatio = totalLeads > 0 ? Math.round((validLeads / totalLeads) * 100) : 0;

  const totalSpent = marketing?.totalSpent || 0;
  const cpv = validLeads > 0 ? Math.round(totalSpent / validLeads) : 0;

  const nonPerforming = safeProjects.filter((p) => (p?.spent || 0) > 0 && (p?.revenue || 0) === 0);

  return (
    <div>
      <EmptyDataBanner show={!connected} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Marketing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evaluasi efisiensi iklan & ROI per proyek perumahan.
        </p>
      </div>

      {/* METRIC CARDS - SANITASI TOTAL */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="Total Ad Spend"
          value={live ? formatChartNominal(totalSpent) : "Rp. 0"}
          sub={<span>Q1: 301.8 Jt · Q2: 41.8 Jt</span>}
          tone="electric"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          label="Total Leads Generated"
          value={live ? (totalLeads || 0).toLocaleString("id-ID") : "0"}
          sub="Lead dari semua kanal"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          label="Valid Leads %"
          value={live && totalLeads > 0 ? `${validRatio}%` : "-"}
          sub="Rasio leads tervalidasi"
          tone="emerald"
          icon={<BadgeCheck className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg. Cost per Valid Lead"
          value={live ? formatChartNominal(cpv || 0) : "Rp. 0"}
          sub="CPV rata-rata"
          tone="warning"
          icon={<TrendingDown className="h-4 w-4" />}
        />
      </div>

      {/* CHART ROI */}
      <div className="mt-6">
        <ChartContainer
          title="ROI & Efisiensi per Proyek"
          description="Total Spend (Bars) vs Revenue Akad (Line)."
          empty={!connected || roiData.length === 0}
          height={380}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={roiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis
                yAxisId="left"
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickFormatter={formatChartNominal}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickFormatter={formatChartNominal}
              />
              <Tooltip
                formatter={(value) => formatChartNominal(value)}
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                yAxisId="right"
                dataKey="spend"
                name="Total Spend"
                fill="var(--color-chart-2)"
                radius={[6, 6, 0, 0]}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="akad"
                name="Revenue Akad"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* NON PERFORMING LIST */}
      <div className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold">Proyek Non-Performing</h2>
        {!connected ? (
          <p className="mt-3 text-sm text-muted-foreground">Menunggu koneksi data...</p>
        ) : nonPerforming.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Semua proyek sudah menghasilkan akad. 🎉
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {nonPerforming.map((p) => (
              <li
                key={p.name}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2"
              >
                <span className="font-medium">{p.name}</span>
                <div className="flex gap-4 text-xs font-medium">
                  <span className="text-amber-500">Spend: {formatChartNominal(p.spent || 0)}</span>
                  <span className="text-muted-foreground">
                    Rev Akad: {formatChartNominal(p.revenue || 0)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
