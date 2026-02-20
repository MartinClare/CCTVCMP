import { prisma } from "@/lib/prisma";
import { IncidentTable } from "@/components/incidents/incident-table";

export default async function IncidentsPage() {
  const incidents = await prisma.incident.findMany({
    include: {
      project: { select: { name: true } },
      zone: { select: { name: true } },
      camera: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { detectedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Incident Management</h2>
      <IncidentTable incidents={incidents} />
    </div>
  );
}
