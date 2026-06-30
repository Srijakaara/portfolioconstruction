import { useNavigate } from "react-router"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts"
import { Card } from "@heroui/react"
import { Header } from "@/components/common/Header"
import { StatCard } from "@/components/common/StatCard"
import { KPICard } from "@/components/common/KPICard"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ProgressBar } from "@/components/common/ProgressBar"
import { LiveChip, LiveDotRow } from "@/components/common/LiveChip"
import { IconButton } from "@/components/common/IconButton"
import { useRiskStore, type AIStatus, type DecisionEntity } from "@/store/useRiskStore"
import {
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Radar,
  SlidersHorizontal,
  Activity,
  BrainCircuit,
} from "lucide-react"
import { ORDERED_PALETTE, DECISION_STATUS_TO_KEY, TINT } from "@/lib/colors"

const memorySeries = [
  { week: "Wk 1", signals: 180 },
  { week: "Wk 2", signals: 340 },
  { week: "Wk 3", signals: 520 },
  { week: "Wk 4", signals: 740 },
  { week: "Wk 5", signals: 980 },
  { week: "Wk 6", signals: 1240 },
]

const systemHealth = [
  { label: "Regime Detection Engine", status: "Optimal", icon: Radar },
  { label: "Dynamic Allocation Engine", status: "Synced", icon: SlidersHorizontal },
  { label: "Stress + Scenario Engine", status: "Optimal", icon: Activity },
  { label: "Risk Memory Layer", status: "Synced", icon: BrainCircuit },
]

const PILLARS: DecisionEntity["pillar"][] = ["Regime Detection", "Dynamic Allocation", "Stress Engine", "Risk Memory"]

const PILLAR_BAR_SERIES = [
  { key: "pending", label: "Pending", color: TINT.amber.hex },
  { key: "approved", label: "Approved", color: TINT.emerald.hex },
  { key: "rejected", label: "Rejected", color: TINT.rose.hex },
  { key: "escalated", label: "Escalated", color: TINT.orange.hex },
] as const

const CYCLE_TO_DAYS: Record<string, number> = {
  monthly: 30,
  "bi-weekly": 14,
  weekly: 7,
  daily: 1,
}

function cycleToDays(cycle: string) {
  return CYCLE_TO_DAYS[cycle.toLowerCase()] ?? 30
}

function formatRelative(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime()
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const CONFIDENCE_BANDS = [
  { key: "critical", label: "Critical (<0.65)", min: 0, max: 0.65 },
  { key: "low", label: "Low (0.65–0.80)", min: 0.65, max: 0.8 },
  { key: "medium", label: "Medium (0.80–0.90)", min: 0.8, max: 0.9 },
  { key: "high", label: "High (≥0.90)", min: 0.9, max: 1.01 },
] as const

export function DashboardPage() {
  const { metrics, decisions, currentUser } = useRiskStore()
  const navigate = useNavigate()

  const canSeeWorkbench = currentUser?.permissions?.includes("/workbench") ?? false

  const counts = {
    total: decisions.length,
    pending: decisions.filter((d) => d.status === "pending").length,
    approved: decisions.filter((d) => d.status === "approved").length,
    rejected: decisions.filter((d) => d.status === "rejected").length,
    escalated: decisions.filter((d) => d.status === "exception").length,
  }

  const statCards = [
    { label: "Total Decisions", value: counts.total, icon: Layers, tint: "indigo" as const, status: null },
    { label: "Pending Review", value: counts.pending, icon: Clock, tint: "amber" as const, status: "pending" as AIStatus },
    { label: "Approved", value: counts.approved, icon: CheckCircle2, tint: "emerald" as const, status: "approved" as AIStatus },
    { label: "Rejected", value: counts.rejected, icon: XCircle, tint: "rose" as const, status: "rejected" as AIStatus },
    { label: "Escalated", value: counts.escalated, icon: AlertTriangle, tint: "orange" as const, status: "exception" as AIStatus },
  ]

  const stressCycleDays = cycleToDays(metrics.stressTestCycle)

  const kpis = [
    { label: "Max Drawdown", value: `${metrics.maxDrawdown}%`, status: "at_risk" as const, baseline: -22, current: metrics.maxDrawdown, target: -14, pillar: "Dynamic Allocation" },
    { label: "Tracking Error", value: `${metrics.trackingError}%`, status: "on_track" as const, baseline: -25, current: metrics.trackingError, target: -12, pillar: "Dynamic Allocation" },
    { label: "Regime Change Flag", value: `+${metrics.regimeChangeFlagDays} days`, status: "at_risk" as const, baseline: 0, current: metrics.regimeChangeFlagDays, target: 5, pillar: "Regime Detection" },
    { label: "Allocator NPS", value: `+${metrics.allocatorNPS} pts`, status: "off_track" as const, baseline: 0, current: metrics.allocatorNPS, target: 12, pillar: "Risk Memory" },
    { label: "Stress-Test Cycle", value: metrics.stressTestCycle, status: "on_track" as const, baseline: 30, current: stressCycleDays, target: 7, pillar: "Stress Engine" },
  ]

  const confidenceBands = CONFIDENCE_BANDS.map((band, i) => ({
    ...band,
    count: decisions.filter((d) => d.confidence >= band.min && d.confidence < band.max).length,
    color: ORDERED_PALETTE[i],
  }))

  const recentDecisions = [...decisions]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6)

  const decisionsByPillar = PILLARS.map((pillar) => {
    const pillarDecisions = decisions.filter((d) => d.pillar === pillar)
    return {
      pillar,
      pending: pillarDecisions.filter((d) => d.status === "pending").length,
      approved: pillarDecisions.filter((d) => d.status === "approved").length,
      rejected: pillarDecisions.filter((d) => d.status === "rejected").length,
      escalated: pillarDecisions.filter((d) => d.status === "exception").length,
    }
  })

  return (
    <div className="space-y-7 px-8 py-6">
      <Header
        title="Executive Dashboard"
        subtitle="Real-time KPI tracking against POC baseline targets."
        actions={
          <>
            <LiveChip />
            <IconButton icon={RefreshCw} aria-label="Refresh dashboard" />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            value={<span className="nums">{stat.value}</span>}
            label={stat.label}
            icon={stat.icon}
            tint={stat.tint}
            onClick={
              canSeeWorkbench
                ? () => navigate(stat.status ? `/workbench?status=${stat.status}` : "/workbench")
                : undefined
            }
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Key Performance Indicators
        </span>
        <span className="text-[11px] text-slate-400">Baseline &rarr; Current &rarr; Target</span>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map(({ pillar, ...kpi }) => (
          <KPICard
            key={kpi.label}
            {...kpi}
            onClick={
              canSeeWorkbench ? () => navigate(`/workbench?pillar=${encodeURIComponent(pillar)}`) : undefined
            }
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card variant="transparent" className="surface-card p-6 lg:col-span-8">
          <h3 className="text-[15px] font-semibold text-slate-900">Portfolio Risk Memory Compounder</h3>
          <p className="text-[12.5px] text-slate-400">Training signals captured — Wk 1 to Wk 6</p>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={memorySeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis hide domain={[0, "dataMax + 200"]} />
                <Tooltip
                  contentStyle={{ borderRadius: 4, border: "1px solid #ececf1", fontSize: 12 }}
                  formatter={(value) => [`${Number(value).toLocaleString()} signals`, "Compounding Memory"]}
                />
                <Area type="monotone" dataKey="signals" stroke="#6366f1" strokeWidth={2} fill="url(#memoryGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card variant="transparent" className="surface-card flex flex-col p-7 lg:col-span-4">
          <h3 className="text-[15px] font-semibold text-slate-900">System Health</h3>
          <p className="text-[12.5px] text-slate-400">Pillar engine status — live</p>
          <div className="flex flex-1 flex-col justify-center divide-y divide-[#ececf1]">
            {systemHealth.map((row) => (
              <LiveDotRow key={row.label} label={row.label} status={row.status} icon={row.icon} className="py-4" />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card variant="transparent" className="surface-card p-6 lg:col-span-8">
          <h3 className="text-[15px] font-semibold text-slate-900">Decisions by Pillar</h3>
          <p className="text-[12.5px] text-slate-400">
            {PILLAR_BAR_SERIES.map((s) => s.label).join(" · ")}
          </p>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={decisionsByPillar}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                barGap={4}
                barCategoryGap="20%"
              >
                <CartesianGrid vertical={false} stroke="#ececf1" strokeDasharray="4 4" />
                <XAxis
                  dataKey="pillar"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #ececf1", fontSize: 12 }} />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-[12px] text-slate-600">{value}</span>}
                />
                {PILLAR_BAR_SERIES.map((s) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={48} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card variant="transparent" className="surface-card flex flex-col p-7 lg:col-span-4">
          <h3 className="text-[15px] font-semibold text-slate-900">Confidence Band Breakdown</h3>
          <p className="text-[12.5px] text-slate-400">Decisions by model confidence</p>
          <div className="flex flex-1 flex-col justify-center space-y-6">
            {confidenceBands.map((band) => (
              <div key={band.key}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12.5px] text-slate-500">{band.label}</span>
                  <span className="nums text-[15px] font-semibold text-slate-800">{band.count}</span>
                </div>
                <ProgressBar
                  value={Math.max(4, (band.count / Math.max(1, counts.total)) * 100)}
                  color={band.color}
                  minPct={4}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card variant="transparent" className="surface-card p-0">
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Recent Decision Activity</h3>
            <p className="text-[12.5px] text-slate-400">Latest AI-proposed actions across all pillars</p>
          </div>
          {canSeeWorkbench && (
            <button
              type="button"
              onClick={() => navigate("/workbench")}
              className="flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="mt-4">
          {recentDecisions.map((d) => (
            <div
              key={d.id}
              onClick={() => navigate(`/audit/${d.id}`)}
              className="hairline flex items-center gap-4 border-b px-6 py-3.5 last:border-0 hover:bg-slate-50/60 cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-900">{d.proposedAction}</p>
                <p className="nums mt-0.5 text-[11px] text-slate-400">{d.id} · {d.pillar} · {d.fundName}</p>
              </div>
              <StatusBadge status={DECISION_STATUS_TO_KEY[d.status]} className="shrink-0" />
              <span className="nums w-16 shrink-0 text-right text-[11px] text-slate-400">{formatRelative(d.timestamp)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
