import { prisma } from "@/lib/prisma";
import { buildAnalyticsSnapshot } from "@/lib/analytics";
import { AnalyticsCharts } from "@/components/analytics/charts";

export default async function AnalyticsPage() {
  const [metrics, incidents] = await Promise.all([
    prisma.dailyMetric.findMany({ orderBy: { date: "asc" }, take: 30 }),
    prisma.incident.findMany(),
  ]);

  const snapshot = buildAnalyticsSnapshot(metrics, incidents);
  const lowRisk = incidents.length - snapshot.highRiskCount;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Analytics</h2>
      <AnalyticsCharts trend={snapshot.trend} highRisk={snapshot.highRiskCount} lowRisk={lowRisk} ppeCompliance={snapshot.ppeCompliance} />
    </div>
  );
}
