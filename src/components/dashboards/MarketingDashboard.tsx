import { MetricCard } from "@/components/MetricCard";
import { ChartContainer } from "@/components/ChartContainer";
import { EmptyDataBanner } from "@/components/EmptyDataBanner";
import { useSpreadsheet } from "@/lib/spreadsheet";
import { useSalesData, formatIDRCompact } from "@/lib/sales";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { DollarSign, Users, BadgeCheck, TrendingDown } from "lucide-react";

// --- FUNGSI CUSTOM FORMATTER (OTOMATIS RIBUAN, JUTA, & MILIAR) ---
const formatChartNominal = (value) => {
  if (value === 0) return "Rp. 0";
  
  // Jika mencapai Miliar
  if (value >= 1000000000) {
    return `Rp. ${Number((value / 1000000000).toFixed(1))} M`;
  }
  
  // Jika mencapai Juta
  if (value >= 1000000) {
    return `Rp. ${Number((value / 1000000).toFixed(1))} Jt`;
  }
  
  // Jika angka mentah berupa satuan (9, 18) tapi maksudnya ribuan (9.000, 18.000)
  if (value > 0 && value < 1000) {
    return `Rp. ${(value * 1000).toLocaleString("id-ID")}`;
  }

  // Jika angka sudah normal ribuan / ratusan ribu (misal 9000)
  return `Rp. ${value.toLocaleString("id-ID")}`;
};

export function MarketingDashboard() {
  const { isSalesConnected } = useSpreadsheet();
  const connected = isSalesConnected;
  const { marketing, projects, funnel, loading } = useSalesData();
  const live = connected && !loading;
  const z = "0";

  // Map data untuk chart ROI dengan key 'spend'
  const roi = (live ? projects : []).map((p) => ({
    name: p.name, 
    spend: p.spent, // Disamakan menjadi spend
    akad: p.revenue,
  }));

  const totalLeads = funnel.leads;
  const validRatio = totalLeads > 0 ? Math.round((funnel.validLeads / totalLeads) * 100) : 0;
  const cpv = funnel.validLeads > 0 ? Math.round(marketing.totalSpent / funnel.validLeads) : 0;

  // Filter proyek non-performing (ada spend tapi akad nol)
  const nonPerforming = (live ? projects : []).filter((p) => p.spent > 0 && p.revenue === 0);

  return (
    <div>
      <EmptyDataBanner show={!connected} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Marketing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Evaluasi efisiensi iklan & ROI per proyek perumahan.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="Total Ad Spend"
          value={live ? formatChartNominal(marketing.totalSpent) : "Rp. 0"}
          sub={<span>Q1: 301.8 Jt · Q2: 41.8 Jt</span>}
          tone="electric"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          label="Total Leads Generated"
          value={live ? totalLeads.toLocaleString("id-ID") : z}
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
          value={live && cpv > 0 ? formatChartNominal(cpv) : "Rp. 0"}
          sub="CPV rata-rata"
          tone="warning"
          icon={<TrendingDown className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6">
        <ChartContainer
          title="ROI & Efisiensi per Proyek"
          description="Total Spend (Bars) vs Revenue Akad (Line). Proyek tanpa akad otomatis ditandai warning."
          empty={!connected || roi.length === 0}
          height={380}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={roi}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
              
              {/* Sumbu Kiri untuk Revenue Akad */}
              <YAxis 
                yAxisId="left" 
                stroke="var(--color-muted-foreground)" 
                fontSize={11} 
                tickFormatter={formatChartNominal}
              />
              
              {/* Sumbu Kanan untuk Total Spend */}
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="var(--color-muted-foreground)" 
                fontSize={11} 
                tickFormatter={formatChartNominal}
              />

              <Tooltip 
                formatter={(value) => formatChartNominal(value)}
                contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} 
              />
              
              <Legend wrapperStyle={{ fontSize: 12 }} />
              
              <Bar yAxisId="right" dataKey="spend" name="Total Spend" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              <Line yAxisId="left" type="monotone" dataKey="akad" name="Revenue Akad" stroke="var(--color-chart-1)" strokeWidth={2.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold">Proyek Non-Performing</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Daftar proyek dengan spend tinggi & akad nol.
        </p>
        {!connected ? (
          <p className="mt-3 text-sm text-muted-foreground">Belum ada data untuk dievaluasi.</p>
        ) : nonPerforming.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Semua proyek menghasilkan akad. 🎉</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {nonPerforming.map((p) => (
              <li key={p.name} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <span className="font-medium mb-1 sm:mb-0">{p.name}</span>
                <div className="flex gap-4 text-xs font-medium">
                  <span className="text-amber-500">Spend: {formatChartNominal(p.spent)}</span>
                  <span className="text-muted-foreground">Rev Akad: {formatChartNominal(p.revenue)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
