import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Network, Lock, ArrowRight, ServerCog } from "lucide-react";

const BENEFITS = [
  "Multiple labs can train locally on their own private data",
  "Raw patient/sample data never leaves the originating lab",
  "Only model updates (gradients/weights) are shared and aggregated",
  "Improves privacy for sensitive genomics data",
  "Enables collaboration across institutions without data-sharing agreements",
];

export default function FederatedLearning() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={Network}
          title="Federated Learning — Research Preview"
          description="Simulated demonstration of privacy-preserving, multi-lab model training for sensitive genomics data."
          badges={[{ label: "Research Preview", color: BADGE_COLORS.researchPreview }]}
        />
        <PrototypeBanner text="Federated learning prototype simulation for research demonstration. No real distributed training infrastructure exists yet — this is a conceptual walkthrough." />

        <Card className="border-border/60">
          <CardContent className="pt-6 pb-6">
            <SectionTitle><ServerCog className="w-4 h-4" /> Simulated Flow</SectionTitle>
            <div className="flex flex-wrap items-center gap-2 justify-center py-4 text-sm">
              {["Lab A local training", "Lab B local training", "Lab C local training", "Secure aggregation", "Global model update"].map((s, i, arr) => (
                <span key={s} className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-md bg-secondary/50 border border-border font-medium text-center">{s}</span>
                  {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle><Lock className="w-4 h-4" /> Why Federated Learning</SectionTitle>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              {BENEFITS.map(b => <li key={b}>{b}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
