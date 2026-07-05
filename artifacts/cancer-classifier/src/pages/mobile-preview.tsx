import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Smartphone, Bell, CheckCircle2 } from "lucide-react";

const SAMPLES = [
  { id: "BRCA-0117", status: "Completed", confidence: 91.2, subtype: "Luminal A" },
  { id: "GBM-0042", status: "Processing", confidence: null, subtype: null },
  { id: "LUAD-0009", status: "Completed", confidence: 84.5, subtype: "Adenocarcinoma" },
];

export default function MobilePreview() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[420px] mx-auto space-y-6">
        <PageHeader
          icon={Smartphone}
          title="Mobile Companion Preview"
          description="Responsive mobile-style preview for reviewing results on the go."
          badges={[{ label: "Preview — Web Only", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="This is a responsive web/mobile preview, not a separate native mobile app. A dedicated mobile app is a future production item." />

        <Card className="border-border/60 rounded-3xl overflow-hidden">
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
            <span className="font-bold text-sm">GeneClassifier</span>
            <Bell className="w-4 h-4" />
          </div>
          <CardContent className="pt-4 pb-4 space-y-3">
            {SAMPLES.map(s => (
              <div key={s.id} className="border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold">{s.id}</span>
                  <Badge className={s.status === "Completed" ? `${BADGE_COLORS.success} border-0 text-[10px]` : `${BADGE_COLORS.warning} border-0 text-[10px]`}>
                    {s.status}
                  </Badge>
                </div>
                {s.status === "Completed" ? (
                  <>
                    <div className="text-xs text-muted-foreground">Predicted: <span className="font-medium text-foreground">{s.subtype}</span></div>
                    <div className="text-xs text-muted-foreground">Confidence: {s.confidence}%</div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="h-7 text-[11px] flex-1"><CheckCircle2 className="w-3 h-3 mr-1" /> Approve</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1">Review</Button>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">Analysis in progress…</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
