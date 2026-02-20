import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAnalyticsSnapshot } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  const [metrics, incidents] = await Promise.all([
    prisma.dailyMetric.findMany({ where: projectId ? { projectId } : undefined, orderBy: { date: "asc" }, take: 60 }),
    prisma.incident.findMany({ where: projectId ? { projectId } : undefined }),
  ]);

  return NextResponse.json({ data: buildAnalyticsSnapshot(metrics, incidents) });
}
