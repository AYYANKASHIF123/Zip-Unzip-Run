import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Presentation, CheckCircle2, ArrowRight } from "lucide-react";

const POINTS = [
  "Strong, well-defined research problem: interpretable cancer subtype classification from gene expression data",
  "Clear end-to-end workflow: upload → validate → predict → explain → report",
  "Working prototype covering FYP, startup MVP, and advanced research-preview modules",
  "Future SaaS model with tiered plans (Free / Researcher / Lab / Institution / Enterprise)",
  "API access potential for programmatic lab integration",
  "Team workspace potential for multi-researcher collaboration",
  "Structured 8-week research pilot plan ready to execute with 1-3 labs",
  "Validation roadmap toward external TCGA/GEO benchmarking",
];

export default function InvestorSummary() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[900px] mx-auto space-y-6">
        <PageHeader
          icon={Presentation}
          title="Why This Can Become a Startup"
          description="One-page summary for investors and FYP examiners on GeneClassifier's readiness and growth potential."
          badges={[{ label: "Investor / Examiner Summary", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner tone="warning" text="Realistic 60–80% prototype/pilot readiness target. Clinical validation is still required before any clinical claim can be made." />

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle><CheckCircle2 className="w-4 h-4 text-green-500" /> Key Strengths</SectionTitle>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              {POINTS.map(p => <li key={p}>{p}</li>)}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-bold text-sm">Research Pilot Adoption Readiness</div>
                <p className="text-xs text-muted-foreground mt-1">A readiness estimate, not a success guarantee.</p>
              </div>
              <span className="text-3xl font-bold text-primary">70%</span>
            </div>
            <Separator className="my-3" />
            <p className="text-sm">
              GeneClassifier is a working prototype with real breadth: authentication, workspaces, API access preview,
              billing preview, institutional dashboard, explainable AI, and reporting. With external validation and
              lab pilot feedback, it has a realistic path to research-lab pilot adoption. Clinical deployment
              remains a separate, longer-term goal requiring formal validation and regulatory review.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3 flex-wrap">
          <Button size="sm" asChild>
            <Link href="/success-readiness">Success Readiness Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/roadmap">Roadmap <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
