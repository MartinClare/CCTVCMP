import { prisma } from "@/lib/prisma";
import { CameraGrid } from "@/components/live/camera-grid";

export default async function LivePage() {
  const cameras = await prisma.camera.findMany({ include: { zone: true, project: true } });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Live Monitoring</h2>
      <CameraGrid cameras={cameras} />
    </div>
  );
}
