"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  incidentId: string;
  currentStatus: "open" | "acknowledged" | "resolved" | "dismissed" | "record_only";
};

export function IncidentActions({ incidentId, currentStatus }: Props) {
  const [pending, setPending] = useState<string | null>(null);

  async function updateStatus(target: string) {
    setPending(target);
    try {
      await fetch(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      window.location.reload();
    } finally {
      setPending(null);
    }
  }

  if (currentStatus === "resolved" || currentStatus === "dismissed" || currentStatus === "record_only") {
    return <span className="text-xs text-muted-foreground">No actions</span>;
  }

  return (
    <div className="flex gap-1">
      {currentStatus === "open" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => updateStatus("acknowledged")}
          disabled={pending !== null}
        >
          {pending === "acknowledged" ? "..." : "Acknowledge"}
        </Button>
      )}
      {(currentStatus === "open" || currentStatus === "acknowledged") && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => updateStatus("resolved")}
          disabled={pending !== null}
        >
          {pending === "resolved" ? "..." : "Resolve"}
        </Button>
      )}
      {(currentStatus === "open" || currentStatus === "acknowledged") && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus("dismissed")}
          disabled={pending !== null}
        >
          {pending === "dismissed" ? "..." : "Dismiss"}
        </Button>
      )}
    </div>
  );
}
