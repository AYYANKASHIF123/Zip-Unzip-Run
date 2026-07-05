import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Target, Users, AlertCircle, Sparkles } from "lucide-react";

const TARGET_USERS = [
  "University genomics researchers",
  "Cancer biology labs",
  "Bioinformatics students",
  "Oncology research departments",
  "Biotech research teams",
];

const PAIN_POINTS = [
  "Manual, spreadsheet-driven gene expression analysis",
  "Fragmented tools for validation, prediction, and reporting",
  "Limited explainability in existing ML notebooks",
  "No built-in team collaboration or audit trail for research groups",
];

export default function MarketValidation() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={Target}
          title="Market Validation"
          description="Assessment of target users, pain points, and early market fit for GeneClassifier as a research tool."
          badges={[{ label: "Market Validation Readiness: 65%", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="This is based on prototype completeness, research use case clarity, pricing model, and pilot-readiness — not confirmed market traction or paying customers." />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-5">
              <SectionTitle><Users className="w-4 h-4" /> Target Users</SectionTitle>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                {TARGET_USERS.map(u => <li key={u}>{u}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-5">
              <SectionTitle><AlertCircle className="w-4 h-4" /> Pain Points</SectionTitle>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                {PAIN_POINTS.map(p => <li key={p}>{p}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle><Sparkles className="w-4 h-4" /> Why GeneClassifier Is Different</SectionTitle>
            <p className="text-sm text-muted-foreground">
              GeneClassifier unifies upload, validation, prediction, explainability, reporting, and team collaboration
              into a single research workflow — instead of forcing researchers to stitch together notebooks, spreadsheets,
              and separate visualization tools.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <div className="text-xs font-bold mb-1">Early Adopter Profile</div>
                <p className="text-xs text-muted-foreground">Small university labs (2-10 researchers) running batch gene expression studies with limited engineering support.</p>
              </div>
              <div>
                <div className="text-xs font-bold mb-1">Adoption Barriers</div>
                <p className="text-xs text-muted-foreground">Trust in ML predictions, need for external validation, integration with existing lab data pipelines.</p>
              </div>
            </div>
            <Badge className={`${BADGE_COLORS.warning} border-0 mt-3`}>Validation Status: Prototype / Not Yet Field-Tested</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
