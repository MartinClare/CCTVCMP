import { prisma } from "@/lib/prisma";
import { IncidentTable } from "@/components/incidents/incident-table";
import { AutoRefresh } from "@/components/auto-refresh";
import type { IncidentStatus, IncidentRiskLevel } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatHKT } from "@/lib/utils";

const VALID_STATUSES: IncidentStatus[] = ["open", "acknowledged", "resolved", "dismissed", "record_only"];
const VALID_RISKS: IncidentRiskLevel[] = ["low", "medium", "high", "critical"];

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const riskParam = typeof params.riskLevel === "string" ? params.riskLevel : undefined;

  const statusFilter = statusParam
    ?.split(",")
    .filter((s): s is IncidentStatus => VALID_STATUSES.includes(s as IncidentStatus));

  const riskFilter = riskParam
    ?.split(",")
    .filter((r): r is IncidentRiskLevel => VALID_RISKS.includes(r as IncidentRiskLevel));

  const incidents = await prisma.incident.findMany({
    where: {
      ...(statusFilter?.length ? { status: { in: statusFilter } } : {}),
      ...(riskFilter?.length ? { riskLevel: { in: riskFilter } } : {}),
    },
    include: {
      project: { select: { name: true } },
      zone: { select: { name: true } },
      camera: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { detectedAt: "desc" },
  });

  const cameraIds = Array.from(new Set(incidents.map((i) => i.cameraId)));
  const evidenceReports = cameraIds.length
    ? await prisma.edgeReport.findMany({
        where: {
          cameraId: { in: cameraIds },
          eventImagePath: { not: null },
        },
        select: {
          id: true,
          cameraId: true,
          eventImagePath: true,
          overallRiskLevel: true,
          receivedAt: true,
        },
        orderBy: { receivedAt: "desc" },
        take: 1000,
      })
    : [];

  const evidenceByCamera = new Map<string, typeof evidenceReports>();
  for (const r of evidenceReports) {
    const arr = evidenceByCamera.get(r.cameraId) ?? [];
    arr.push(r);
    evidenceByCamera.set(r.cameraId, arr);
  }

  const incidentsWithEvidence = incidents.map((incident) => {
    const candidates = evidenceByCamera.get(incident.cameraId) ?? [];
    let best: (typeof candidates)[number] | null = null;
    let bestDiff = Number.POSITIVE_INFINITY;

    for (const c of candidates) {
      const diff = Math.abs(c.receivedAt.getTime() - incident.detectedAt.getTime());
      if (diff < bestDiff) {
        bestDiff = diff;
        best = c;
      }
    }

    // Keep only nearby evidence (within 2 hours) to avoid misleading mismatches.
    const evidence = best && bestDiff <= 2 * 60 * 60 * 1000
      ? {
          reportId: best.id,
          imagePath: best.eventImagePath,
          riskLevel: best.overallRiskLevel,
          receivedAt: best.receivedAt,
        }
      : null;

    return { ...incident, evidence };
  });

  const recentEdgeRiskReports = await prisma.edgeReport.findMany({
    take: 20,
    where: {
      messageType: "analysis",
      keepalive: false,
      overallRiskLevel: { in: ["Medium", "High", "Critical"] },
    },
    select: {
      id: true,
      cameraName: true,
      overallRiskLevel: true,
      overallDescription: true,
      eventImagePath: true,
      eventTimestamp: true,
      receivedAt: true,
    },
    orderBy: { receivedAt: "desc" },
  });

  const recentEdgeReports = recentEdgeRiskReports.length
    ? recentEdgeRiskReports
    : await prisma.edgeReport.findMany({
        take: 10,
        where: {
          messageType: "analysis",
          keepalive: false,
        },
        select: {
          id: true,
          cameraName: true,
          overallRiskLevel: true,
          overallDescription: true,
          eventImagePath: true,
          eventTimestamp: true,
          receivedAt: true,
        },
        orderBy: { receivedAt: "desc" },
      });

  const filterLabel = [
    statusFilter?.length ? `Status: ${statusFilter.join(", ")}` : null,
    riskFilter?.length ? `Risk: ${riskFilter.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <AutoRefresh intervalSec={10} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Incident Management</h2>
          {filterLabel && (
            <p className="text-sm text-muted-foreground mt-1">
              Filtered by: <span className="font-medium text-foreground">{filterLabel}</span>
              &nbsp;·&nbsp;
              <a href="/incidents" className="text-primary hover:underline">
                Clear filter
              </a>
            </p>
          )}
        </div>
      </div>
      <IncidentTable incidents={incidentsWithEvidence} />

      <Card>
        <CardHeader>
          <CardTitle>Edge Risk Records</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            The standard edge build sends <span className="font-medium text-foreground">JSON analysis only</span> to the
            CMP (no JPEG). Evidence thumbnails appear here only when a report includes a stored image (e.g. future
            multipart uploads).{" "}
            <span className="text-foreground/80">
              Configure a camera stream on the edge device page for a live visual reference.
            </span>
          </p>
          {incidentsWithEvidence.length === 0 && (
            <p className="mb-3 text-sm text-muted-foreground">
              No incidents were generated yet. Recent edge risk records are shown below.
            </p>
          )}
          {recentEdgeRiskReports.length === 0 && (
            <p className="mb-3 text-sm text-muted-foreground">
              No Medium/High/Critical records in the latest window; showing latest analysis records instead.
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Camera</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Evidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEdgeReports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No edge event records found
                  </TableCell>
                </TableRow>
              )}
              {recentEdgeReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.cameraName}</TableCell>
                  <TableCell>
                    <Badge variant={report.overallRiskLevel.toLowerCase() === "critical" ? "destructive" : "secondary"}>
                      {report.overallRiskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xl truncate">{report.overallDescription}</TableCell>
                  <TableCell className="text-xs">{formatHKT(report.eventTimestamp ?? report.receivedAt)}</TableCell>
                  <TableCell>
                    {report.eventImagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={report.eventImagePath}
                        alt="Edge event evidence"
                        className="h-12 w-20 rounded border object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
