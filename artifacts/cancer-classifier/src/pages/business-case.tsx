import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Briefcase } from "lucide-react";

const SECTIONS = [
  { title: "Problem", body: "Cancer subtype classification from gene expression data is fragmented across manual spreadsheets, disconnected ML notebooks, and portals lacking explainability or collaboration." },
  { title: "Solution", body: "GeneClassifier unifies upload, validation, ML prediction, explainable AI, reporting, and team workspaces in one platform." },
  { title: "Target Users", body: "University research labs, oncology genomics teams, bioinformatics students, biotech research teams." },
  { title: "Pricing", body: "Free student tier, Researcher ($49/mo), Lab ($299/mo), and custom Enterprise plans." },
  { title: "Expected Use Cases", body: "Batch subtype classification for research cohorts, teaching tool for bioinformatics courses, exploratory biomarker discovery." },
  { title: "Cost Assumptions", body: "Cloud hosting, PostgreSQL database, ML inference compute, and support staffing scale with usage tier." },
  { title: "Revenue Model", body: "Tiered subscription (Free / Researcher / Lab / Institution / Enterprise) plus optional on-premise licensing." },
  { title: "Risks", body: "Limited real-world validation, slow institutional adoption, competition from established bioinformatics tools." },
  { title: "Mitigation Plan", body: "Research-use-only positioning, structured pilot program, external validation pipeline, transparent readiness scoring." },
];

export default function BusinessCase() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={Briefcase}
          title="Business Case"
          description="A structured business case summarising the problem, solution, and commercial rationale for GeneClassifier."
          badges={[{ label: "Prototype", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="This business case is a planning artifact for FYP/startup evaluation, not a validated financial model." />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTIONS.map(s => (
            <Card key={s.title} className="border-border/60">
              <CardContent className="pt-4 pb-4">
                <div className="font-bold text-sm mb-1">{s.title}</div>
                <p className="text-xs text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm font-medium">
              With real external validation and pilot feedback, this prototype could reach 60–80% readiness for research-lab pilot adoption.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
