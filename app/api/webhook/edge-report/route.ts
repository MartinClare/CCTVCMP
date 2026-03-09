import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { edgeReportSchema } from "@/lib/validations/webhook";
import { classifyAnalysis } from "@/lib/llm-classifier";
import { evaluateAlarms, ensureDefaultRules } from "@/lib/alarm-engine";

function getApiKey(request: NextRequest): string | null {
  return request.headers.get("x-api-key") ?? request.headers.get("X-API-Key");
}

/**
 * Background task: classify the saved EdgeReport and evaluate alarms.
 * Runs after the HTTP response is already sent so the edge device isn't blocked.
 */
async function processReportBackground(
  edgeReportId: string,
  analysis: Parameters<typeof classifyAnalysis>[0],
  cameraContext: { cameraId: string; projectId: string; zoneId: string },
  detectedAt: Date
) {
  try {
    await ensureDefaultRules();

    const classification = await classifyAnalysis(analysis);

    await prisma.edgeReport.update({
      where: { id: edgeReportId },
      data: { classificationJson: classification as object },
    });

    await evaluateAlarms(classification, cameraContext, edgeReportId, detectedAt);
  } catch (err) {
    console.error("[webhook] Background processing failed for report", edgeReportId, err);
  }
}

export async function POST(request: NextRequest) {
  const apiKey = getApiKey(request);
  const expectedKey = process.env.EDGE_API_KEY;
  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = edgeReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
  }

  const { edgeCameraId, cameraName, timestamp, analysis } = parsed.data;

  // --- Resolve or auto-create camera ---
  let camera = await prisma.camera.findUnique({
    where: { edgeCameraId },
    include: { project: true, zone: true },
  });

  if (!camera) {
    let project = await prisma.project.findFirst();
    let zone = await prisma.zone.findFirst({ where: { projectId: project?.id } });
    if (!project) {
      project = await prisma.project.create({
        data: { name: "Edge Site", location: "Edge" },
      });
    }
    if (!zone) {
      zone = await prisma.zone.create({
        data: { projectId: project.id, name: "Default", riskLevel: "medium" },
      });
    }
    camera = await prisma.camera.create({
      data: {
        name: cameraName,
        edgeCameraId,
        projectId: project.id,
        zoneId: zone.id,
      },
      include: { project: true, zone: true },
    });
  }

  // Ensure camera has a zone
  let zoneId = camera.zoneId;
  if (!zoneId) {
    const zone =
      (await prisma.zone.findFirst({ where: { projectId: camera.projectId } })) ??
      (await prisma.zone.create({
        data: { projectId: camera.projectId, name: "Default", riskLevel: "medium" },
      }));
    zoneId = zone.id;
    await prisma.camera.update({ where: { id: camera.id }, data: { zoneId } });
  }

  // --- 1. Persist EdgeReport (full payload in rawJson) ---
  const fullPayload = { edgeCameraId, cameraName, timestamp, analysis };
  const edgeReport = await prisma.edgeReport.create({
    data: {
      cameraId: camera.id,
      edgeCameraId,
      cameraName,
      overallRiskLevel: analysis.overallRiskLevel,
      overallDescription: analysis.overallDescription,
      peopleCount: analysis.peopleCount ?? null,
      missingHardhats: analysis.missingHardhats ?? null,
      missingVests: analysis.missingVests ?? null,
      rawJson: fullPayload as object,
    },
  });

  // --- 2. Update Camera.lastReportAt and sync name from edge ---
  await prisma.camera.update({
    where: { id: camera.id },
    data: { lastReportAt: new Date(), status: "online", name: cameraName },
  });

  // --- 3. Fire background processing (LLM + alarms) — don't block the response ---
  processReportBackground(
    edgeReport.id,
    analysis as Parameters<typeof classifyAnalysis>[0],
    { cameraId: camera.id, projectId: camera.projectId, zoneId },
    new Date(timestamp)
  ).catch(() => {/* already logged inside */});

  // --- 4. Respond immediately so the edge device isn't kept waiting ---
  return NextResponse.json({ reportId: edgeReport.id, status: "accepted" }, { status: 202 });
}
