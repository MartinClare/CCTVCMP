"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function IncidentNotes({ incidentId, currentNotes }: { incidentId: string; currentNotes: string | null }) {
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        className="w-full rounded-md border border-border bg-background p-3 text-sm min-h-[80px] resize-y"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes about this incident..."
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Notes"}
        </Button>
        {saved && <span className="text-xs text-green-500">Saved</span>}
      </div>
    </div>
  );
}
