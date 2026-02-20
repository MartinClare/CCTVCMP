import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <Card>
        <CardHeader><CardTitle>System Configuration</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Configure RBAC policies, alert preferences, and project-level defaults.</p></CardContent>
      </Card>
    </div>
  );
}
