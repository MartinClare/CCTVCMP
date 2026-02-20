import { IncidentRiskLevel, IncidentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IncidentActions } from "@/components/incidents/incident-actions";

type IncidentRow = {
  id: string;
  type: string;
  riskLevel: IncidentRiskLevel;
  status: IncidentStatus;
  detectedAt: Date;
  project: { name: string };
  zone: { name: string };
  camera: { name: string };
  assignee: { name: string } | null;
};

function riskVariant(level: IncidentRiskLevel): "default" | "secondary" | "destructive" {
  if (level === "critical") return "destructive";
  if (level === "high") return "default";
  return "secondary";
}

export function IncidentTable({ incidents }: { incidents: IncidentRow[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Incident Tracking</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead><TableHead>Type</TableHead><TableHead>Risk</TableHead><TableHead>Status</TableHead><TableHead>Project</TableHead><TableHead>Zone</TableHead><TableHead>Camera</TableHead><TableHead>Assigned To</TableHead><TableHead>Detected</TableHead><TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((incident) => (
              <TableRow key={incident.id}>
                <TableCell className="font-mono text-xs">{incident.id}</TableCell>
                <TableCell>{incident.type.replaceAll("_", " ")}</TableCell>
                <TableCell><Badge variant={riskVariant(incident.riskLevel)}>{incident.riskLevel}</Badge></TableCell>
                <TableCell>{incident.status}</TableCell>
                <TableCell>{incident.project.name}</TableCell>
                <TableCell>{incident.zone.name}</TableCell>
                <TableCell>{incident.camera.name}</TableCell>
                <TableCell>{incident.assignee?.name ?? "Unassigned"}</TableCell>
                <TableCell>{incident.detectedAt.toLocaleString()}</TableCell>
                <TableCell><IncidentActions incidentId={incident.id} currentStatus={incident.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
