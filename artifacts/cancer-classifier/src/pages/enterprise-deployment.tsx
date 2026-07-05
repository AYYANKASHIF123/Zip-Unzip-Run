import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { ShieldCheck, Server, Database, ClipboardList, ArrowRight } from "lucide-react";

const CHECKLIST = [
  "On-premise architecture documented",
  "Private database deployment option",
  "Local ML inference (no external calls)",
  "No external data transfer by default",
  "Admin controls and role management",
  "Audit logs for all analyses",
  "Backup strategy defined",
];

export default function EnterpriseDeployment() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={ShieldCheck}
          title="Enterprise On-Premise Deployment"
          description="Architecture package for institutions requiring fully private, on-premise deployment of the platform."
          badges={[{ label: "Prototype Package", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="This describes the intended on-premise architecture and controls. No enterprise on-premise deployment has been executed yet — this is a design/readiness document." />

        <Card className="border-border/60">
          <CardContent className="pt-6 pb-6">
            <SectionTitle><Server className="w-4 h-4" /> Architecture Flow</SectionTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm justify-center py-4">
              {["Frontend", "API", "ML Service", "Private PostgreSQL", "Audit Logs"].map((s, i, arr) => (
                <span key={s} className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-md bg-secondary/50 border border-border font-medium">{s}</span>
                  {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle><ClipboardList className="w-4 h-4" /> Deployment Checklist</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {CHECKLIST.map(c => (
                <div key={c} className="flex items-center gap-2 text-sm bg-secondary/30 rounded-md px-3 py-2">
                  <Database className="w-3.5 h-3.5 text-primary shrink-0" /> {c}
                </div>
              ))}
            </div>
            <Badge className={`${BADGE_COLORS.planned} border-0 mt-3`}>Production Planned</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
