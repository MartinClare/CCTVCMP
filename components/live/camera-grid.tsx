import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Camera = {
  id: string;
  name: string;
  status: string;
  streamUrl?: string | null;
  zone?: { name: string } | null;
  project: { name: string };
};

export function CameraGrid({ cameras }: { cameras: Camera[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cameras.map((camera) => (
        <Card key={camera.id}>
          <CardHeader><CardTitle className="text-sm">{camera.name}</CardTitle></CardHeader>
          <CardContent>
            <div className="aspect-video w-full rounded-md bg-gradient-to-br from-slate-800 to-slate-950 p-2">
              <div className="flex h-full items-center justify-center rounded border border-slate-700 text-xs text-slate-300">
                {camera.streamUrl ? (
                  <StreamEmbed streamUrl={camera.streamUrl} />
                ) : (
                  <div className="text-center">
                    <p className="font-medium">No stream URL configured</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {camera.project.name} · {camera.zone?.name ?? "Unassigned Zone"}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Status: {camera.status}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function StreamEmbed({ streamUrl }: { streamUrl: string }) {
  const lower = streamUrl.toLowerCase();

  // Most edge camera "live" endpoints are MJPEG streams; render directly in img.
  if (lower.includes(".mjpg") || lower.includes("mjpeg")) {
    return <img src={streamUrl} alt="Live stream" className="h-full w-full rounded object-cover" />;
  }

  // HLS or MP4 endpoints can be played in the browser video element.
  if (lower.endsWith(".m3u8") || lower.endsWith(".mp4")) {
    return (
      <video
        className="h-full w-full rounded object-cover"
        src={streamUrl}
        autoPlay
        muted
        playsInline
        controls
      />
    );
  }

  // RTSP isn't browser-playable directly; show actionable hint.
  if (lower.startsWith("rtsp://")) {
    return (
      <div className="text-center">
        <p className="font-medium">RTSP stream configured</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Browser cannot play RTSP directly. Use an HLS/MJPEG gateway URL.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="font-medium">Stream URL configured</p>
      <a href={streamUrl} target="_blank" rel="noreferrer" className="mt-1 block text-[11px] underline text-slate-400">
        Open stream URL
      </a>
    </div>
  );
}
