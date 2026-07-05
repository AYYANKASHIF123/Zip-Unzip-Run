import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { FlaskConical, CheckCircle2, Target } from "lucide-react";

const PLAN_WEEKS = [
  { week: "Weeks 1-2", task: "Onboarding: workspace setup, demo data walkthrough, role assignment" },
  { week: "Weeks 3-4", task: "Dataset testing: lab uploads real (anonymized) or demo gene expression data" },
  { week: "Weeks 5-6", task: "Batch prediction & report quality review with lab feedback sessions" },
  { week: "Week 7", task: "API usage testing and integration feedback" },
  { week: "Week 8", task: "Final pilot report, feedback synthesis, and go/no-go review" },
];

const SUCCESS_METRICS = [
  "100+ demo/sample analyses completed",
  "80%+ successful CSV validation rate",
  "Less than 5% failed predictions",
  "User satisfaction score above 4/5",
  "At least 3 useful researcher feedback points",
  "At least 1 external validation dataset tested",
];

export default function PilotProgram() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={FlaskConical}
          title="Research Pilot Program"
          description="An 8-week structured plan for onboarding 1-3 university or research labs as pilot users."
          badges={[{ label: "Pilot Readiness: 70%", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="This is a planned pilot program design, not evidence that a pilot has been run yet." />

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle><Target className="w-4 h-4" /> 8-Week Pilot Plan (Target: 1-3 Labs)</SectionTitle>
            <div className="space-y-2">
              {PLAN_WEEKS.map(p => (
                <div key={p.week} className="flex gap-3 text-sm bg-secondary/30 rounded-md px-3 py-2">
                  <span className="font-bold w-24 shrink-0">{p.week}</span>
                  <span className="text-muted-foreground">{p.task}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle><CheckCircle2 className="w-4 h-4" /> Pilot Success Metrics</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUCCESS_METRICS.map(m => (
                <div key={m} className="flex items-start gap-2 text-sm bg-secondary/30 rounded-md px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> {m}
                </div>
              ))}
            </div>
            <Badge className={`${BADGE_COLORS.prototype} border-0 mt-3`}>Readiness estimate — not a guarantee of pilot outcome</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
