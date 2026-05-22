import { useState } from "react"; // 1. Tambahkan useState untuk kontrol tombol X
import { MetricCard } from "@/components/MetricCard";
import { ChartContainer } from "@/components/ChartContainer";
import { EmptyDataBanner } from "@/components/EmptyDataBanner";
import { AIKpiHealthInsight } from "@/components/AIKpiHealthInsight";
import { useSpreadsheet } from "@/lib/spreadsheet";
import { useSalesData } from "@/lib/sales";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  X,
} from "lucide-react"; // 2. Tambahkan icon X

const fmtId = (n: number) => n.toLocaleString("id-ID");
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

const QUARTERLY_TARGET_DATA = [
  { period: "Q1", target: 100, realisasi: 70 },
  { period: "Q2", target: 150, realisasi: 37 },
  { period: "Q3", target: 125, realisasi: 0 },
  { period: "Q4", target: 125, realisasi: 0 },
];

export function SalesDashboard() {
  const { isSalesConnected } = useSpreadsheet();
  const connected = isSalesConnected;
  const { kpi, funnel, sources, revenueAkadRaw, loading } = useSalesData();
  const live = connected && !loading;

  // 3. State untuk menyembunyikan / menampilkan alert Bottleneck
  const [showBottleneck, setShowBottleneck] = useState(true);

  const z = "0";

  const FUNNEL_LAYERS = [
    { key: "leads", label: "TOTAL LEADS", value: funnel.leads, pctLabel: "100%", width: "w-full" },
    {
      key: "valid",
      label: "TOTAL VALID LEADS",
      value: funnel.validLeads,
      pctLabel: `${pct(funnel.validLeads, funnel.leads)}% dari Total Leads`,
      width: "w-[85%]",
    },
    {
      key: "cv",
      label: "TOTAL CONFIRMED VISIT / CV",
      value: funnel.cv,
      pctLabel: `${pct(funnel.cv, funnel.validLeads)}% dari Valid Leads`,
      width: "w-[70%]",
      bottleneck: true,
    },
    {
      key: "pv",
      label: "TOTAL PROJECT VISITOR / PV",
      value: funnel.pv,
      pctLabel: `${pct(funnel.pv, funnel.cv)}% dari CV`,
      width: "w-[55%]",
    },
    {
      key: "purchaser",
      label: "TOTAL PURCHASER",
      value: funnel.purchaser,
      pctLabel: `${pct(funnel.purchaser, funnel.pv)}% dari PV`,
      width: "w-[40%]",
    },
  ] as {
    key: string;
    label: string;
    value: number;
    pctLabel: string;
    width: string;
    bottleneck?: boolean;
  }[];

  const cancelRate = kpi.booking > 0 ? (kpi.batal / kpi.booking) * 100 : 0;
  const salesStatus: { label: string; tone: "emerald" | "warning" | "danger" } =
    cancelRate > 15
      ? { label: "Kritis", tone: "danger" }
      : cancelRate < 5
        ? { label: "Sehat", tone: "emerald" }
        : { label: "Waspada", tone: "warning" };
  const aiMessage = `AI Insight: Performa penjualan saat ini ${salesStatus.label}. Terdapat tingkat pembatalan sebesar ${cancelRate.toFixed(1)}%. Disarankan evaluasi pada tim Sales untuk meminimalisir pembatalan di bulan depan.`;

  const revenueAkadDisplay =
    live && revenueAkadRaw
      ? /^rp/i.test(revenueAkadRaw)
        ? revenueAkadRaw
        : `Rp ${revenueAkadRaw}`
      : "Rp 0";

  return (
    <div>
      <EmptyDataBanner show={!connected} />

      <AIKpiHealthInsight status={salesStatus} message={aiMessage} disabled={!live} />

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pantau kinerja penjualan & funnel akuisisi unit secara realtime.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Target Penjualan"
          value="500"
          sub="Unit / Tahun"
          tone="emerald"
          icon={<Target className="h-4 w-4" />}
        />
        <MetricCard
          label="Booking"
          value={live ? fmtId(kpi.booking) : z}
          sub="Unit terdaftar"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          label="Jumlah Akad"
          value={live ? fmtId(kpi.akad) : z}
          sub="Akad terverifikasi"
          tone="emerald"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          label="On Progress"
          value={live ? fmtId(kpi.onProgress) : z}
          sub={live ? "Unit berjalan" : "Belum ada status pasti"}
          icon={<Clock className="h-4 w-4" />}
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              {live ? "live" : "pending"}
            </span>
          }
        />
        <MetricCard
          label="Total Batal"
          value={live ? fmtId(kpi.batal) : z}
          sub="Pembatalan"
          tone="danger"
          icon={<XCircle className="h-4 w-4" />}
        />
        <MetricCard
          label="Revenue Akad"
          value={revenueAkadDisplay}
          sub="Total Revenue Akad"
          tone="electric"
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Funnel Leads</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Konversi tiap tahapan akuisisi unit
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${connected ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground"}`}
              />
              {connected ? "Live" : "Offline"}
            </span>
          </div>

          <div className="flex flex-col items-center gap-3">
            {FUNNEL_LAYERS.map((layer) => {
              const isBottleneck = !!layer.bottleneck;

              // 4. Modifikasi baseShell: Jika showBottleneck = false, kembalikan warna kotak ke normal (tidak kedip kuning)
              const baseShell = connected
                ? isBottleneck && showBottleneck
                  ? "border-amber-500/60 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-red-500/15 shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_8px_30px_-12px_rgba(245,158,11,0.55)] animate-pulse backdrop-blur-md"
                  : "border-white/15 bg-white/10 backdrop-blur-md shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)]"
                : "border-dashed border-muted-foreground/20 bg-muted/10 backdrop-blur-sm";

              const valueText = connected ? fmtId(layer.value) : "0";
              const pctText = connected ? layer.pctLabel : "0%";

              return (
                <div key={layer.key} className={`${layer.width} transition-all`}>
                  <div className={`relative rounded-lg border px-5 py-3 text-center ${baseShell}`}>
                    {/* 5. Tambahkan tombol silang X untuk menyembunyikan info bottleneck */}
                    {isBottleneck && connected && showBottleneck && (
                      <span className="absolute -top-2.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-amber-500/50 bg-background pl-2.5 pr-7 py-0.5 text-[10px] font-semibold text-amber-500 shadow-sm">
                        <AlertTriangle className="h-3 w-3" /> Bottleneck Utama Tim Sales
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowBottleneck(false);
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-amber-500 hover:bg-amber-500/10 hover:text-amber-700 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}

                    <div className="flex flex-col items-center text-center">
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${connected ? "text-muted-foreground" : "text-muted-foreground/50"}`}
                      >
                        {layer.label}
                      </p>
                      <p
                        className={`mt-1 text-2xl font-bold tabular-nums ${connected ? (isBottleneck && showBottleneck ? "text-amber-500" : "text-foreground") : "text-muted-foreground/40"}`}
                      >
                        {valueText}
                      </p>
                      <p
                        className={`mt-0.5 text-[11px] font-medium ${connected ? "text-muted-foreground" : "text-muted-foreground/40"}`}
                      >
                        {pctText}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ChartContainer
          title="Quarterly Sales Target vs Realization"
          description="Target vs Realisasi penjualan per kuartal 2026 (unit)"
          className="lg:col-span-3"
          height={360}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={QUARTERLY_TARGET_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="period" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [`${fmtId(value)} unit`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="target"
                name="Target"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line
                type="monotone"
                dataKey="realisasi"
                name="Realisasi"
                stroke="var(--color-chart-2)"
                strokeWidth={2.5}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            {/* 6. Perbaikan Teks Petunjuk Target Sheet Sumber Penjualan */}
            <div>
              <h2 className="text-base font-semibold">Sumber Penjualan</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Data diambil berdasarkan akumulasi dinamis dari sheet 🔗 SUMBER PENJUALAN / DATA
                PENJUALAN.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Sumber Penjualan</th>
                  <th className="py-2 px-3 text-right font-medium">Total Akad</th>
                  <th className="py-2 pl-3 text-right font-medium">Total Booking</th>
                </tr>
              </thead>
              <tbody>
                {connected && sources.length > 0 ? (
                  sources.map((s) => (
                    <tr key={s.name} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-foreground">{s.name}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{fmtId(s.akad)}</td>
                      <td className="py-2.5 pl-3 text-right tabular-nums">{fmtId(s.booking)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      {connected
                        ? "Data tidak ditemukan pada sheet SUMBER PENJUALAN."
                        : "Belum ada data."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
            KPI Health Alert
          </h2>
          {connected ? (
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Analisis funnel akan tampil otomatis setelah sinkronisasi data berhasil dilakukan.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada data yang dapat dianalisis. Hubungkan spreadsheet untuk mengaktifkan analisa
              KPI otomatis.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
