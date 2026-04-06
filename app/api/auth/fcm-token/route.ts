import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";
import { AUTH_COOKIE } from "@/lib/constants";
import { z } from "zod";

const bodySchema = z.object({
  token: z.string().min(1),
  deviceName: z.string().optional(),
});

/**
 * POST /api/auth/fcm-token
 * Register (or refresh) an FCM device token for the authenticated user.
 * Called by the mobile app after login or when FCM issues a new token.
 */
export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (!cookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyJwt(cookie);
  if (!payload?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { token, deviceName } = parsed.data;

  // Upsert: if this token already exists update its deviceName + updatedAt,
  // otherwise create a new row.  The unique constraint on `token` ensures
  // a token can never be registered to two different users.
  await prisma.userFcmToken.upsert({
    where: { token },
    update: { userId: payload.sub, deviceName },
    create: { userId: payload.sub, token, deviceName },
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/auth/fcm-token
 * Remove an FCM device token (call on logout or when user disables notifications).
 */
export async function DELETE(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (!cookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyJwt(cookie);
  if (!payload?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = z.object({ token: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await prisma.userFcmToken.deleteMany({
    where: { token: parsed.data.token, userId: payload.sub },
  });

  return NextResponse.json({ ok: true });
}
