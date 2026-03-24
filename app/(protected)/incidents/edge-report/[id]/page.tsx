import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatHKT } from "@/lib/utils";

type Props = { params: { id: string } };

function riskBadgeVariant(level: string): "secondary" | "default" | "destructive" {
  const v = level.toLowerCase();
  if (v === "critical" || v === "high") return "destructive";
  if (v === "medium") return "default";
  return "secondary";
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export default async function EdgeReportDetailPage({ params }: Props) {
  const report = await prisma.edgeReport.findUnique({
    where: { id: params.id },
    include: {
      camera: {
        select: {
          id: true,
          name: true,
          edgeCameraId: true,
          status: true,
          streamUrl: true,
        },
      },
    },
  });

  if (!report) notFound();

  return (
    <div className="space-y-6">
      <AutoRefresh intervalSec={10} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Edge Risk Record Details</h2>
          <p className="text-sm text-muted-foreground">
            Report ID: {report.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={riskBadgeVariant(report.overallRiskLevel)}>{report.overallRiskLevel}</Badge>
          <Badge variant="outline">{report.messageType}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Camera Name" value={report.cameraName} />
          <Row label="Edge Camera ID" value={report.edgeCameraId} />
          <Row label="Camera (CMP)" value={report.camera?.name ?? "—"} />
          <Row label="Timestamp" value={formatHKT(report.eventTimestamp ?? report.receivedAt)} />
          <Row label="Received At" value={formatHKT(report.receivedAt)} />
          <Row label="Keepalive" value={report.keepalive ? "true" : "false"} />
          <Row label="Image Included Flag" value={report.eventImageIncluded ? "true" : "false"} />
          <Row label="Image MIME Type" value={report.eventImageMimeType ?? "—"} />
          {report.camera?.streamUrl && (
            <div className="pt-1">
              <span className="text-muted-foreground">Camera Stream</span>
              <div>
                <a className="text-primary hover:underline break-all" href={report.camera.streamUrl} target="_blank" rel="noreferrer">
                  {report.camera.streamUrl}
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Overall Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{report.overallDescription || "No description."}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Evidence Image</CardTitle>
        </CardHeader>
        <CardContent>
          {report.eventImagePath ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={report.eventImagePath}
                alt="Edge report evidence"
                className="max-h-[70vh] w-full rounded border object-contain"
              />
              <p className="text-xs text-muted-foreground break-all">{report.eventImagePath}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No image attached for this record.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Construction Safety</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap overflow-auto">{prettyJson(report.constructionSafety)}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fire Safety</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap overflow-auto">{prettyJson(report.fireSafety)}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Property Security</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap overflow-auto">{prettyJson(report.propertySecurity)}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Counts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="People Count" value={report.peopleCount?.toString() ?? "—"} />
            <Row label="Missing Hardhats" value={report.missingHardhats?.toString() ?? "—"} />
            <Row label="Missing Vests" value={report.missingVests?.toString() ?? "—"} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Raw Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap overflow-auto">{prettyJson(report.rawJson)}</pre>
        </CardContent>
      </Card>

      <div>
        <Link href="/incidents" className="text-sm text-primary hover:underline">
          ← Back to incidents
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right break-all">{value}</span>
    </div>
  );
}
