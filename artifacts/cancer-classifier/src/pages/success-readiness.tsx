import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { ScoreCard, ProgressRow } from "@/components/shared/ScoreCard";
import {
  Gauge, GraduationCap, Rocket, FlaskConical, Building2, HeartPulse,
  Lightbulb, ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";

const READINESS_SCORES = [
  {
    icon: GraduationCap,
    title: "FYP Success Readiness",
    score: 95,
    color: "#22c55e",
    reason:
      "The app has complete UI, CSV upload, validation, ML prediction, explainability, reporting, model evaluation, roadmap, architecture, and presentation mode.",
  },
  {
    icon: Rocket,
    title: "Startup Prototype Readiness",
    score: 80,
    color: "#8b5cf6",
    reason:
      "The app includes product-style features such as authentication prototype, workspaces, billing preview, API access, institutional dashboard, report export, roadmap, and startup positioning.",
  },
  {
    icon: FlaskConical,
    title: "Research Lab Pilot Potential",
    score: 70,
    color: "#3b82f6",
    reason:
      "The platform supports gene expression upload, batch prediction, external validation preview, model performance, explainable AI, cohort analytics, and report exports.",
  },
  {
    icon: Building2,
    title: "SaaS Readiness",
    score: 65,
    color: "#f59e0b",
    reason:
      "The app has plans/pricing preview, API keys, usage limits, workspace support, report history, admin analytics, and deployment readiness.",
  },
  {
    icon: HeartPulse,
    title: "Clinical Deployment Readiness",
    score: 25,
    color: "#ef4444",
    reason:
      "The platform is not clinically validated yet. Clinical use would require external validation, real patient/lab datasets, privacy compliance, regulatory review, and clinical partnerships.",
  },
];

const BREAKDOWN = [
  { subject: "Product completeness", value: 90 },
  { subject: "Technical completeness", value: 85 },
  { subject: "ML credibility", value: 65 },
  { subject: "Research value", value: 80 },
  { subject: "Demo reliability", value: 90 },
  { subject: "Market potential", value: 65 },
  { subject: "Compliance readiness", value: 40 },
  { subject: "Clinical validation status", value: 20 },
];

const RECOMMENDATIONS = [
  "Real external TCGA/GEO validation",
  "Real cloud deployment",
  "Research lab feedback",
  "Published FYP manuscript",
  "Pilot testing with university lab",
  "Stronger privacy/compliance design",
  "More real datasets",
  "Better SHAP integration",
  "More batch/cohort analytics",
  "API documentation",
];

export default function SuccessReadiness() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1100px] mx-auto space-y-6">
        <PageHeader
          icon={Gauge}
          title="Success Readiness Dashboard"
          description="An honest, professional view of the project's readiness across different adoption contexts — from FYP submission to a hypothetical clinical deployment."
          badges={[
            { label: "Readiness Estimate", color: BADGE_COLORS.prototype },
            { label: "Not a Success Guarantee", color: BADGE_COLORS.warning },
          ]}
        />

        <PrototypeBanner
          tone="warning"
          text='These scores represent prototype readiness and presentation strength, not guaranteed commercial or clinical success. Clinical deployment readiness is intentionally kept low because real clinical validation, regulatory approval, privacy compliance, and medical partnerships are still required.'
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {READINESS_SCORES.map(s => (
            <ScoreCard key={s.title} icon={s.icon} title={s.title} score={s.score} reason={s.reason} color={s.color} />
          ))}
        </div>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-5">
              <SectionTitle><Gauge className="w-4 h-4" /> Visual Score Breakdown (Radar)</SectionTitle>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={BREAKDOWN} outerRadius="75%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="pt-5 pb-5">
              <SectionTitle><Gauge className="w-4 h-4" /> Score Breakdown (Progress Bars)</SectionTitle>
              <div className="space-y-3.5 mt-2">
                {BREAKDOWN.map(b => <ProgressRow key={b.subject} label={b.subject} score={b.value} />)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle><Lightbulb className="w-4 h-4 text-amber-500" /> Recommendations to Improve Readiness</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">
              Concrete next steps that would raise research-pilot and SaaS readiness scores toward production strength.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {RECOMMENDATIONS.map(r => (
                <div key={r} className="flex items-start gap-2 text-sm bg-secondary/40 rounded-md px-3 py-2">
                  <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 flex-wrap">
          <Link href="/roadmap" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
            View Product Roadmap <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/investor-summary" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
            Investor / Examiner Summary <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
