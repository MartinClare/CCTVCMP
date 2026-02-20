"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Bar, BarChart } from "recharts";

type TrendPoint = { date: string; totalIncidents: number; avgResponseTime: number; ppeComplianceRate: number };

export function AnalyticsCharts({ trend, highRisk, lowRisk, ppeCompliance }: { trend: TrendPoint[]; highRisk: number; lowRisk: number; ppeCompliance: number }) {
  const riskData = [{ name: "High/Critical", value: highRisk }, { name: "Low/Medium", value: lowRisk }];

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Daily Incident Trend</CardTitle></CardHeader>
        <CardContent className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="totalIncidents" stroke="#06b6d4" strokeWidth={2} /><Line type="monotone" dataKey="avgResponseTime" stroke="#a78bfa" strokeWidth={2} /></LineChart></ResponsiveContainer></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Risk Distribution</CardTitle></CardHeader>
        <CardContent className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={riskData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label><Cell fill="#ef4444" /><Cell fill="#22c55e" /></Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>PPE Compliance</CardTitle></CardHeader>
        <CardContent className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ name: "Compliance", value: ppeCompliance }]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="value" fill="#06b6d4" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></CardContent>
      </Card>
    </section>
  );
}
