import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { TrendingUp, ArrowRight } from "lucide-react";

const STAGES = [
  { title: "First Target Market", detail: "Universities and research labs" },
  { title: "First Users", detail: "Students, bioinformatics researchers, genomics teams" },
  { title: "Entry Strategy", detail: "Free student/demo accounts" },
  { title: "Pilot Strategy", detail: "Offer research lab pilot access" },
  { title: "Growth Strategy", detail: "Convert labs into paid team plans" },
  { title: "Long-Term Strategy", detail: "Enterprise / on-premise research deployment" },
];

export default function GoToMarket() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={TrendingUp}
          title="Go-To-Market Strategy"
          description="Staged plan for moving from academic prototype to a paid research SaaS product."
          badges={[{ label: "Go-To-Market Readiness: 65%", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="This strategy is a planning document for FYP/startup discussion, not an executed go-to-market campaign." />

        <div className="space-y-2">
          {STAGES.map((s, i) => (
            <Card key={s.title} className="border-border/60">
              <CardContent className="py-4 flex items-center gap-4">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.detail}</div>
                </div>
                {i < STAGES.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
