"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function IncidentActions({ incidentId, currentStatus }: { incidentId: string; currentStatus: "open" | "acknowledged" | "resolved" }) {
  const [pending, setPending] = useState(false);
  const nextStatus = currentStatus === "open" ? "acknowledged" : currentStatus === "acknowledged" ? "resolved" : null;

  async function updateStatus() {
    if (!nextStatus) return;
    setPending(true);
    try {
      await fetch(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      window.location.reload();
    } finally {
      setPending(false);
    }
  }

  if (!nextStatus) return <span className="text-xs text-muted-foreground">No actions</span>;

  return <Button size="sm" variant="secondary" onClick={updateStatus} disabled={pending}>{pending ? "Updating..." : `Mark as ${nextStatus}`}</Button>;
}
