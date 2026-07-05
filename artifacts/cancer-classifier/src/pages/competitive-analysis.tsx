import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Scale, Check, X, Minus } from "lucide-react";

const COMPETITORS = ["GeneClassifier", "Manual Workflow", "Generic ML Notebooks", "Genomics Portals", "Clinical Decision Systems"];
const CRITERIA = [
  { label: "Ease of use", scores: ["full", "none", "partial", "partial", "partial"] },
  { label: "Explainability", scores: ["full", "none", "partial", "none", "partial"] },
  { label: "Report export", scores: ["full", "partial", "none", "partial", "full"] },
  { label: "Batch prediction", scores: ["full", "none", "partial", "partial", "full"] },
  { label: "Team workspace", scores: ["full", "none", "none", "partial", "full"] },
  { label: "API access", scores: ["full", "none", "partial", "partial", "full"] },
  { label: "Model governance", scores: ["partial", "none", "none", "partial", "full"] },
  { label: "Startup readiness", scores: ["full", "none", "none", "partial", "full"] },
];

const ICON: Record<string, React.ReactNode> = {
  full: <Check className="w-4 h-4 text-green-500 mx-auto" />,
  partial: <Minus className="w-4 h-4 text-amber-500 mx-auto" />,
  none: <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />,
};

export default function CompetitiveAnalysis() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={Scale}
          title="Competitive Analysis"
          description="Comparison of GeneClassifier's workflow-level strengths against manual and existing alternatives."
          badges={[{ label: "Prototype Analysis", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="Comparison ratings are qualitative, author-assessed positioning for FYP/startup discussion — not an independent third-party benchmark." />

        <Card className="border-border/60 overflow-x-auto">
          <CardContent className="pt-5 pb-5">
            <SectionTitle>Feature Comparison</SectionTitle>
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-2">Criteria</th>
                  {COMPETITORS.map(c => <th key={c} className="py-2 px-2 text-center font-medium">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map(row => (
                  <tr key={row.label} className="border-t border-border/50">
                    <td className="py-2 pr-2 font-medium">{row.label}</td>
                    {row.scores.map((s, i) => <td key={i} className="py-2 px-2">{ICON[s]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm font-medium">
              GeneClassifier's strength is not only prediction, but the complete research workflow around prediction.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
