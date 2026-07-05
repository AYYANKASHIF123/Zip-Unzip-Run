import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Key, Plus, Trash2, Gauge, Code2 } from "lucide-react";

const API_KEYS = [
  { key: "gc_live_demo_8f2a1c...", tier: "Researcher", usage: "312 / 1,000 mo", created: "2026-03-12" },
  { key: "gc_live_demo_a91be0...", tier: "Lab", usage: "4,820 / 10,000 mo", created: "2026-05-02" },
];

const ENDPOINTS = [
  { method: "POST", path: "/api/analyses", desc: "Submit a new gene expression analysis" },
  { method: "GET", path: "/api/analyses/:id", desc: "Fetch analysis status and results" },
  { method: "POST", path: "/ml/predict", desc: "Run subtype prediction on uploaded expression data" },
  { method: "GET", path: "/api/reports/:id", desc: "Retrieve a generated report" },
  { method: "GET", path: "/api/model-card", desc: "Fetch model card metadata" },
  { method: "GET", path: "/api/genes", desc: "Query the gene reference library" },
  { method: "GET", path: "/api/workspaces", desc: "List workspaces accessible to the API key" },
];

const RATE_LIMITS = [
  { plan: "Free", limit: "50 requests / day" },
  { plan: "Researcher", limit: "1,000 requests / month" },
  { plan: "Lab", limit: "10,000 requests / month" },
  { plan: "Enterprise", limit: "Custom" },
];

export default function ApiAccess() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={Key}
          title="API Access"
          description="External API access tier for programmatic integration with research pipelines and lab systems."
          badges={[{ label: "Prototype", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="API keys shown are demo credentials for illustration only — no live external API gateway is provisioned yet. Rate limiting and quota enforcement are planned for production." />

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle><Key className="w-4 h-4" /> API Keys</SectionTitle>
              <Button size="sm" variant="outline"><Plus className="w-3.5 h-3.5 mr-1" /> Create demo key</Button>
            </div>
            <div className="space-y-2">
              {API_KEYS.map(k => (
                <div key={k.key} className="flex items-center justify-between bg-secondary/30 rounded-md px-3 py-2 text-xs">
                  <span className="font-mono">{k.key}</span>
                  <Badge variant="outline">{k.tier}</Badge>
                  <span className="text-muted-foreground">{k.usage}</span>
                  <span className="text-muted-foreground">Created {k.created}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-5">
              <SectionTitle><Code2 className="w-4 h-4" /> Endpoints</SectionTitle>
              <div className="space-y-1.5">
                {ENDPOINTS.map(e => (
                  <div key={e.path} className="flex items-start gap-2 text-xs">
                    <Badge className="bg-primary/10 text-primary border-0 font-mono text-[10px] shrink-0">{e.method}</Badge>
                    <div>
                      <div className="font-mono">{e.path}</div>
                      <div className="text-muted-foreground">{e.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="pt-5 pb-5">
              <SectionTitle><Gauge className="w-4 h-4" /> Rate Limits by Plan</SectionTitle>
              <div className="space-y-2">
                {RATE_LIMITS.map(r => (
                  <div key={r.plan} className="flex justify-between text-sm bg-secondary/30 rounded-md px-3 py-2">
                    <span className="font-medium">{r.plan}</span>
                    <span className="text-muted-foreground">{r.limit}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <p className="text-xs text-muted-foreground">
                Example request:
              </p>
              <pre className="text-[10px] bg-secondary/40 rounded-md p-2 mt-1 overflow-x-auto">
{`curl -X POST /api/analyses \\
  -H "Authorization: Bearer gc_live_demo_..." \\
  -F "file=@expression.csv"`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
