import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { CreditCard, Check } from "lucide-react";

const PLANS = [
  {
    name: "Free Student",
    price: "$0",
    period: "/mo",
    features: ["50 requests/day", "Demo datasets only", "No report export limit", "No API access", "Community support"],
    highlight: false,
  },
  {
    name: "Researcher",
    price: "$49",
    period: "/mo",
    features: ["1,000 API requests/mo", "Full dataset access", "Unlimited report exports", "Individual API key", "Email support"],
    highlight: false,
  },
  {
    name: "Lab",
    price: "$299",
    period: "/mo",
    features: ["10,000 API requests/mo", "Team workspace (up to 10)", "Institutional dashboard preview", "Priority support", "Report history & audit log"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Unlimited usage", "On-premise deployment", "SLA & dedicated support", "Custom data agreements", "Audit & compliance tooling"],
    highlight: false,
  },
];

export default function Billing() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1100px] mx-auto space-y-6">
        <PageHeader
          icon={CreditCard}
          title="Billing & Plans"
          description="Prototype pricing tiers illustrating the intended commercial model for research and lab customers."
          badges={[{ label: "Billing Prototype", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="Billing prototype — payment integration planned for production. No real charges occur anywhere in this app." />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {PLANS.map(p => (
            <Card key={p.name} className={p.highlight ? "border-primary shadow-md" : "border-border/60"}>
              <CardContent className="pt-5 pb-5 flex flex-col h-full">
                {p.highlight && <Badge className="bg-primary text-primary-foreground border-0 w-fit mb-2 text-[10px]">Most Popular</Badge>}
                <div className="font-bold text-sm">{p.name}</div>
                <div className="mt-1 mb-3">
                  <span className="text-2xl font-bold">{p.price}</span>
                  <span className="text-xs text-muted-foreground">{p.period}</span>
                </div>
                <div className="space-y-1.5 flex-1">
                  {p.features.map(f => (
                    <div key={f} className="flex items-start gap-1.5 text-xs">
                      <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant={p.highlight ? "default" : "outline"} className="mt-4 w-full" disabled>
                  Demo plan — not billable
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
