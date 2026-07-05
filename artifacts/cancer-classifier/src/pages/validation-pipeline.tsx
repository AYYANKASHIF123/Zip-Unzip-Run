import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { ClipboardCheck, Upload, CheckCircle2, Download } from "lucide-react";

const STEPS = [
  "Upload external validation dataset",
  "Validate required columns",
  "Check cancer subtype labels",
  "Run batch prediction",
  "Calculate accuracy & F1-score",
  "Generate confusion matrix",
];

const METRICS = [
  { label: "Accuracy", value: "88.2%" },
  { label: "F1-Score (macro)", value: "0.86" },
  { label: "Precision", value: "0.87" },
  { label: "Recall", value: "0.85" },
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
        <PrototypeBanner text="This prototype reuses the platform's existing model performance metrics to demonstrate the validation workflow. It is not an independent, peer-reviewed external validation study." />

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle>Pipeline Steps</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2 text-sm bg-secondary/30 rounded-md px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>{i + 1}. {s}</span>
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
              <SectionTitle>Validation Result (Demo)</SectionTitle>
              <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5 mr-1" /> Export validation report</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {METRICS.map(m => (
                <div key={m.label} className="bg-secondary/40 rounded-md py-3 text-center">
                  <div className="text-lg font-bold">{m.value}</div>
                  <div className="text-[10px] text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>
            <Badge className={`${BADGE_COLORS.prototype} border-0 mt-3`}>Based on existing model metrics — prototype validation only</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
