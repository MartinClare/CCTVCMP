import { prisma } from "@/lib/prisma";
import { getMessaging } from "@/lib/firebase-admin";
import type { Incident, IncidentRiskLevel, IncidentType } from "@prisma/client";

type IncidentWithRelations = Incident & {
  camera?: { name: string } | null;
  zone?: { name: string } | null;
  project?: { name: string } | null;
};

const RISK_EMOJI: Record<IncidentRiskLevel, string> = {
  low: "🟡",
  medium: "🟠",
  high: "🔴",
  critical: "🚨",
};

const INCIDENT_LABEL: Record<IncidentType, string> = {
  ppe_violation: "PPE Violation",
  fall_risk: "Fall Risk",
  restricted_zone_entry: "Restricted Zone Entry",
  machinery_hazard: "Machinery Hazard",
  near_miss: "Near Miss",
  smoking: "Smoking",
  fire_detected: "Fire Detected",
  smoke_detected: "Smoke Detected",
};

/**
 * Send FCM push notifications for an incident to all target-role users
 * who have registered FCM tokens.
 *
 * targetRoles defaults to ["admin", "project_manager", "safety_officer"].
 * Stale/invalid tokens are automatically removed from the database.
 */
export async function sendFcmPush(
  incident: IncidentWithRelations,
  targetRoles: string[] = ["admin", "project_manager", "safety_officer"]
): Promise<void> {
  // Get all FCM tokens for users with the target roles
  const tokenRows = await prisma.userFcmToken.findMany({
    where: {
      user: { role: { in: targetRoles as never[] } },
    },
    select: { id: true, token: true },
  });

  if (tokenRows.length === 0) {
    console.log("[FCM] No registered device tokens for roles:", targetRoles);
    return;
  }

  const emoji = RISK_EMOJI[incident.riskLevel] ?? "⚠️";
  const label = INCIDENT_LABEL[incident.type] ?? incident.type;
  const riskLabel = incident.riskLevel.toUpperCase();
  const cameraName = incident.camera?.name ?? "Unknown Camera";
  const projectName = incident.project?.name ?? "";
  const zoneName = incident.zone?.name ?? "";

  const title = `${emoji} ${riskLabel}: ${label}`;
  const body = [cameraName, zoneName, projectName]
    .filter(Boolean)
    .join(" · ");

  const messaging = getMessaging();
  const tokens = tokenRows.map((r) => r.token);

  // Send to all tokens in one multicast call (max 500 per FCM call)
  const chunks = chunkArray(tokens, 500);
  const staleTokens: string[] = [];

  for (const chunk of chunks) {
    const response = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      data: {
        incidentId: incident.id,
        type: incident.type,
        riskLevel: incident.riskLevel,
        cameraName,
        projectName,
        zoneName,
        reasoning: incident.reasoning?.slice(0, 200) ?? "",
        detectedAt: incident.detectedAt.toISOString(),
      },
      android: {
        priority: incident.riskLevel === "critical" || incident.riskLevel === "high"
          ? "high"
          : "normal",
        notification: {
          channelId: "axon_alerts",
          sound: "default",
        },
      },
    });

    // Collect invalid / unregistered tokens for cleanup
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code ?? "";
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered"
        ) {
          staleTokens.push(chunk[idx]);
        } else {
          console.error(`[FCM] Failed to send to token index ${idx}:`, res.error);
        }
      }
    });

    console.log(
      `[FCM] Sent ${response.successCount}/${chunk.length} notifications for incident ${incident.id}`
    );
  }

  // Remove stale tokens so they don't accumulate
  if (staleTokens.length > 0) {
    await prisma.userFcmToken.deleteMany({
      where: { token: { in: staleTokens } },
    });
    console.log(`[FCM] Removed ${staleTokens.length} stale token(s)`);
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
