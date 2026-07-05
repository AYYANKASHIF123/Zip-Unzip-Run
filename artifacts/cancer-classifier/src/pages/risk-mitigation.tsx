import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react";

const RISKS = [
  "Limited real-world dataset validation",
  "Clinical regulation complexity",
  "Privacy concerns around genomics data",
  "Model generalization risk on unseen cohorts",
  "Competition from existing bioinformatics tools",
  "Slow healthcare/institutional adoption",
  "Technical deployment complexity at scale",
];

const MITIGATIONS = [
  "Research-use-only positioning throughout the product",
  "External validation pipeline for independent datasets",
  "Anonymized sample IDs by default",
  "Audit logs for every analysis and report",
  "Role-based access control (Admin / Researcher / Viewer / Lab Manager)",
  "Structured pilot program with feedback loop",
  "Both cloud and on-premise deployment options",
  "Clear disclaimers on every prototype/research-preview page",
];

export default function RiskMitigation() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={ShieldAlert}
          title="Risk & Mitigation"
          description="Honest assessment of key risks facing GeneClassifier's path to research-lab and commercial adoption."
          badges={[{ label: "Prototype Assessment", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="This is a self-assessed risk register for FYP/startup planning purposes, not a formal enterprise risk audit." />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-5">
              <SectionTitle><AlertTriangle className="w-4 h-4 text-amber-500" /> Risks</SectionTitle>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
                {RISKS.map(r => <li key={r}>{r}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-5">
              <SectionTitle><ShieldCheck className="w-4 h-4 text-green-500" /> Mitigations</SectionTitle>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
                {MITIGATIONS.map(m => <li key={m}>{m}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
