import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Rocket, Target, TrendingUp, Users, DollarSign, Building2, ShieldCheck,
  Layers, Lightbulb, Globe, LineChart, Handshake,
} from "lucide-react";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold mb-2 flex items-center gap-2">{children}</h2>;
}

const MARKET_STATS = [
  { label: "Global Precision Oncology Market (2030 est.)", value: "$130B+" },
  { label: "Annual Cancer Diagnoses Worldwide", value: "20M+" },
  { label: "Genomics Labs Using Manual Analysis", value: "60%+" },
  { label: "Avg. Time to Molecular Subtype Result", value: "5–10 days" },
];

const BUSINESS_MODEL = [
  { icon: Users,      tier: "Researcher (Free)",  price: "$0/mo",     desc: "Up to 25 analyses/month, community support, standard model access." },
  { icon: Building2,  tier: "Lab / Team",          price: "$299/mo",  desc: "Unlimited analyses, team seats, priority processing, API access, audit logs." },
  { icon: Globe,      tier: "Enterprise",          price: "Custom",   desc: "On-prem/VPC deployment, custom model training, SLA, dedicated support, compliance package." },
];

const ROADMAP_TO_MARKET = [
  { phase: "Now", label: "FYP Prototype", desc: "Core classification, XAI, and reporting pipeline validated on synthetic data.", done: true },
  { phase: "Next", label: "Clinical Data Partnership", desc: "Partner with a research hospital or biobank for real, de-identified expression cohorts.", done: false },
  { phase: "Next+1", label: "Regulatory Pathway", desc: "Pursue Software-as-a-Medical-Device (SaMD) classification guidance; begin validation studies.", done: false },
  { phase: "Later", label: "Commercial Pilot", desc: "Paid pilot with 2–3 research labs; expand gene panel; add EHR/LIMS integrations.", done: false },
];

const MOAT = [
  { icon: Layers, title: "Full-stack genomics workflow", desc: "Upload → validate → classify → explain → report in one product, replacing disconnected scripts and spreadsheets." },
  { icon: ShieldCheck, title: "Explainability-first design", desc: "Every prediction ships with gene-level contribution scores and data-quality transparency, not a black box." },
  { icon: LineChart, title: "Model-agnostic architecture", desc: "The classification service is decoupled from the app, so new models (deep learning, ensemble) can be swapped in without rewriting the product." },
];

export default function StartupVision() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1100px] mx-auto space-y-8">

        {/* Hero */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0 font-medium">Startup Vision</Badge>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 font-medium">Pre-seed / Concept Stage</Badge>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">From FYP to Startup: The GeneClassifier Vision</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                GeneClassifier began as an academic Final Year Project. This page outlines how the same core
                technology — molecular subtype classification with explainable AI — could evolve into a
                venture-backable diagnostics-support platform, and what still stands between the prototype
                and that outcome.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Market */}
        <div className="space-y-3">
          <SectionTitle><Target className="w-4 h-4 text-primary" />Market Opportunity</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Molecular subtyping is increasingly recognised as more clinically actionable than histology alone, yet many
            labs still rely on manual bioinformatics scripts and disconnected tools to get from raw expression data to
            an interpretable result. A workflow-native, explainable classification platform addresses a real gap
            between research bioinformatics and point-of-care decision support.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MARKET_STATS.map(s => (
              <Card key={s.label} className="text-center border-border/60">
                <CardContent className="pt-4 pb-3">
                  <div className="text-lg font-bold text-primary">{s.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            Figures are illustrative, order-of-magnitude industry estimates for framing purposes — not independently
            verified market research.
          </p>
        </div>

        <Separator />

        {/* Moat */}
        <div className="space-y-3">
          <SectionTitle><Lightbulb className="w-4 h-4 text-primary" />Why This Could Defend a Position</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {MOAT.map(m => (
              <Card key={m.title} className="border-border/60">
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="p-1.5 rounded-md bg-primary/10 w-fit">
                    <m.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-sm font-semibold">{m.title}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Business model */}
        <div className="space-y-3">
          <SectionTitle><DollarSign className="w-4 h-4 text-primary" />Potential Business Model</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {BUSINESS_MODEL.map(b => (
              <Card key={b.tier} className="border-border/60">
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <b.icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">{b.tier}</span>
                  </div>
                  <div className="text-xl font-bold">{b.price}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            Tiered SaaS pricing shown for illustration; actual pricing would depend on validation cost, data
            partnerships, and compliance requirements.
          </p>
        </div>

        <Separator />

        {/* Path to market */}
        <div className="space-y-3">
          <SectionTitle><TrendingUp className="w-4 h-4 text-primary" />Path From Prototype to Product</SectionTitle>
          <div className="space-y-2">
            {ROADMAP_TO_MARKET.map((r, i) => (
              <div key={r.label} className="flex items-start gap-3 rounded-md border border-border/60 p-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  r.done ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                         : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{r.label}</span>
                    <Badge variant="outline" className="text-[10px]">{r.phase}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Honest disclaimer / asks */}
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <Handshake className="w-4 h-4" />
              Honest Status & What Would Be Needed Next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
              This page describes an aspirational direction, not a funded or incorporated company. The current system
              is trained on synthetic data and is not clinically validated. Turning this into a real product would
              require a genomics data partnership, formal clinical validation studies, a regulatory strategy (e.g. SaMD
              guidance), and a data-governance/compliance framework (HIPAA/GDPR-equivalent) before any real patient
              data could be processed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
