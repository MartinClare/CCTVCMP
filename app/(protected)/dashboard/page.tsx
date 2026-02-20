import { prisma } from "@/lib/prisma";
import { KpiCards } from "@/components/kpi-cards";

export default async function DashboardPage() {
  const incidents = await prisma.incident.findMany();
  const metrics = await prisma.dailyMetric.findMany({ orderBy: { date: "desc" }, take: 14 });
  const highRisk = incidents.filter((i) => i.riskLevel === "high" || i.riskLevel === "critical").length;
  const avgResponseTime = metrics.length ? metrics.reduce((acc, item) => acc + item.avgResponseTime, 0) / metrics.length : 0;
  const ppeCompliance = metrics.length ? metrics.reduce((acc, item) => acc + item.ppeComplianceRate, 0) / metrics.length : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Operational Dashboard</h2>
      <KpiCards totalIncidents={incidents.length} highRisk={highRisk} avgResponseTime={avgResponseTime} ppeCompliance={ppeCompliance} />
    </div>
  );
}
