import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { ClipboardCheck, Upload } from "lucide-react";

const STEPS = [
  "Upload external validation dataset",
  "Validate required columns",
  "Check cancer subtype labels",
  "Run batch prediction",
  "Calculate accuracy & F1-score",
  "Generate confusion matrix",
];

export default function ValidationPipeline() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={ClipboardCheck}
          title="External Dataset Validation Pipeline"
          description="Upload an external validation dataset and evaluate the model's performance against it."
          badges={[{ label: "Prototype Validation", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="Workflow sketch only: no external dataset has been uploaded or evaluated. The active model's cross-validation scores are not independent external validation." />

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle>Pipeline Steps</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2 text-sm bg-secondary/30 rounded-md px-3 py-2">
                  <span className="text-xs font-semibold text-muted-foreground">{i + 1}.</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground mb-4">
              <Upload className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs">Upload external validation CSV (demo)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>External Validation Status</SectionTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Not evaluated. No external validation dataset has been uploaded or scored, so no external accuracy, F1, precision, or recall results are available.
            </p>
            <Badge className={`${BADGE_COLORS.prototype} border-0 mt-3`}>External validation results unavailable</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
