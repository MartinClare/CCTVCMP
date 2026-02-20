import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function KpiCards({ totalIncidents, highRisk, avgResponseTime, ppeCompliance }: { totalIncidents: number; highRisk: number; avgResponseTime: number; ppeCompliance: number }) {
  const cards = [
    { title: "Total Incidents", value: totalIncidents.toString() },
    { title: "High Risk Incidents", value: highRisk.toString() },
    { title: "Avg Response Time", value: `${Math.round(avgResponseTime)}m` },
    { title: "PPE Compliance", value: `${ppeCompliance.toFixed(1)}%` },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">{card.title}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{card.value}</p></CardContent>
        </Card>
      ))}
    </section>
  );
}
