import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Building2, Users, FileText, Activity, Database, AlertTriangle, HardDrive } from "lucide-react";

const KPIS = [
  { label: "Total Workspace Analyses", value: "409", icon: Activity },
  { label: "Active Researchers", value: "14", icon: Users },
  { label: "Reports Generated", value: "139", icon: FileText },
  { label: "Average Confidence", value: "87.4%", icon: Database },
  { label: "Failed Analyses", value: "3", icon: AlertTriangle },
  { label: "Storage Usage", value: "2.1 GB / 25 GB", icon: HardDrive },
];

const TEAM_ACTIVITY = [
  { lab: "University Research Lab", action: "Uploaded LUAD cohort (32 samples)", time: "2h ago" },
  { lab: "Oncology Genomics Team", action: "Generated PDF report for BRCA batch", time: "5h ago" },
  { lab: "Demo Cancer Research Group", action: "Ran validation pipeline on demo dataset", time: "1d ago" },
];

const MODEL_USAGE = [
  { model: "Random Forest v2.3", pct: 62 },
  { model: "Gradient Boosting v1.8", pct: 24 },
  { model: "SVM (RBF) v1.1", pct: 14 },
];

export default function InstitutionalDashboard() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1100px] mx-auto space-y-6">
        <PageHeader
          icon={Building2}
          title="Institutional Dashboard"
          description="Aggregated, multi-lab usage overview for institutions running several research workspaces."
          badges={[{ label: "Prototype", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="Metrics below aggregate demo workspace activity to illustrate the institutional reporting concept. Live cross-workspace aggregation is planned for production." />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {KPIS.map(k => (
            <Card key={k.label} className="border-border/60">
              <CardContent className="pt-4 pb-4">
                <k.icon className="w-4 h-4 text-primary mb-2" />
                <div className="text-xl font-bold">{k.value}</div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-5">
              <SectionTitle><Activity className="w-4 h-4" /> Recent Team Activity</SectionTitle>
              <div className="space-y-2">
                {TEAM_ACTIVITY.map((a, i) => (
                  <div key={i} className="text-xs bg-secondary/30 rounded-md px-3 py-2">
                    <div className="font-medium">{a.lab}</div>
                    <div className="text-muted-foreground">{a.action} · {a.time}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="pt-5 pb-5">
              <SectionTitle><Database className="w-4 h-4" /> Model Usage Across Institution</SectionTitle>
              <div className="space-y-3">
                {MODEL_USAGE.map(m => (
                  <div key={m.model}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{m.model}</span>
                      <span className="text-muted-foreground">{m.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${m.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
