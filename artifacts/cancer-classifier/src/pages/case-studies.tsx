import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { FileStack } from "lucide-react";

const CASES = [
  {
    id: "BRCA Demo Sample",
    subtype: "Luminal A (BRCA)",
    confidence: 91.2,
    genes: ["ESR1", "GATA3", "FOXA1"],
    interpretation: "High-confidence prediction consistent with luminal-associated expression pattern.",
    limitation: "Based on a single demo sample; not a validated diagnostic case.",
  },
  {
    id: "LUAD Demo Sample",
    subtype: "Adenocarcinoma (LUAD)",
    confidence: 84.5,
    genes: ["EGFR", "KRAS", "TP53"],
    interpretation: "Moderate-high confidence; contributing genes align with known LUAD driver genes.",
    limitation: "Demo dataset sample — external validation dataset not yet applied to this case.",
  },
  {
    id: "GBM Demo Sample",
    subtype: "Glioblastoma (GBM)",
    confidence: 78.9,
    genes: ["EGFR", "PTEN", "CDKN2A"],
    interpretation: "Reasonable confidence with some overlap against proneural subtype markers.",
    limitation: "Confidence below the platform's high-confidence threshold; recommend manual review.",
  },
];

export default function CaseStudies() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={FileStack}
          title="Demo Case Studies"
          description="Three illustrative walkthroughs of the platform's upload-to-report workflow using demo samples."
          badges={[{ label: "Demo Data", color: BADGE_COLORS.demo }]}
        />
        <PrototypeBanner text="Case studies use demo/synthetic samples for illustration. They are not real patient cases or clinical diagnoses." />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CASES.map(c => (
            <Card key={c.id} className="border-border/60">
              <CardContent className="pt-5 pb-5 space-y-2">
                <div className="font-bold text-sm">{c.id}</div>
                <div className="text-xs text-muted-foreground">Predicted: <span className="text-foreground font-medium">{c.subtype}</span></div>
                <div className="text-xs text-muted-foreground">Confidence: <span className="text-foreground font-medium">{c.confidence}%</span></div>
                <div className="flex flex-wrap gap-1">
                  {c.genes.map(g => <Badge key={g} variant="outline" className="text-[10px]">{g}</Badge>)}
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">{c.interpretation}</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">{c.limitation}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
