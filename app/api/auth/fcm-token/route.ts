import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";

const bodySchema = z.object({
  token: z.string().min(1),
  deviceName: z.string().optional(),
});

/**
 * POST /api/auth/fcm-token — register or refresh the device token for the signed-in user.
 * DELETE — remove a token (logout / disable notifications on device).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { token, deviceName } = parsed.data;

  await prisma.userFcmToken.upsert({
    where: { token },
    update: { userId: user.id, deviceName },
    create: { userId: user.id, token, deviceName },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = z.object({ token: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await prisma.userFcmToken.deleteMany({
    where: { token: parsed.data.token, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}
