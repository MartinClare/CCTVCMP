import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Camera = { id: string; name: string; status: string; zone?: { name: string } | null; project: { name: string } };

export function CameraGrid({ cameras }: { cameras: Camera[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cameras.map((camera) => (
        <Card key={camera.id}>
          <CardHeader><CardTitle className="text-sm">{camera.name}</CardTitle></CardHeader>
          <CardContent>
            <div className="aspect-video w-full rounded-md bg-gradient-to-br from-slate-800 to-slate-950 p-2">
              <div className="flex h-full items-center justify-center rounded border border-slate-700 text-xs text-slate-300">
                LIVE FEED (MOCK)
{camera.project.name} ? {camera.zone?.name ?? "Unassigned Zone"}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Status: {camera.status}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
