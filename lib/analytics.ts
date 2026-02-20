import { DailyMetric, Incident } from "@prisma/client";

export function buildAnalyticsSnapshot(metrics: DailyMetric[], incidents: Incident[]) {
  const sorted = [...metrics].sort((a, b) => a.date.getTime() - b.date.getTime());
  const highRiskCount = incidents.filter((i) => i.riskLevel === "high" || i.riskLevel === "critical").length;
  const avgResponseTime = sorted.length ? sorted.reduce((acc, item) => acc + item.avgResponseTime, 0) / sorted.length : 0;
  const avgPpeCompliance = sorted.length ? sorted.reduce((acc, item) => acc + item.ppeComplianceRate, 0) / sorted.length : 0;

  return {
    trend: sorted.map((item) => ({
      date: item.date.toISOString().slice(0, 10),
      totalIncidents: item.totalIncidents,
      avgResponseTime: item.avgResponseTime,
      ppeComplianceRate: item.ppeComplianceRate,
    })),
    highRiskCount,
    averageResponseTime: Number(avgResponseTime.toFixed(1)),
    ppeCompliance: Number(avgPpeCompliance.toFixed(1)),
  };
}
