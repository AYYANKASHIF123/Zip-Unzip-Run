import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Circle, Rocket, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

type PhaseStatus = "complete" | "active" | "planned" | "future";

interface Phase {
  phase: number;
  title: string;
  subtitle: string;
  status: PhaseStatus;
  eta: string;
  items: { label: string; done: boolean }[];
  color: string;
  badge: string;
}

const PHASES: Phase[] = [
  {
    phase: 1,
    title: "Final Year Project Prototype",
    subtitle: "Core classification pipeline with full UI",
    status: "complete",
    eta: "Completed — May 2025",   // Phase 1 shipped
    color: "border-green-300 bg-green-50/50 dark:bg-green-900/5 dark:border-green-800",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    items: [
      { label: "Dashboard with KPI cards and analytics", done: true },
      { label: "Dataset upload, validation, and management", done: true },
      { label: "6-stage preprocessing pipeline monitor", done: true },
      { label: "Cancer subtype classification (5 subtypes)", done: true },
      { label: "Model performance metrics and confusion matrix", done: true },
      { label: "Gene expression heatmap, PCA, volcano plot", done: true },
      { label: "Kaplan-Meier survival analysis curves", done: true },
      { label: "Report generation and export (CSV/JSON)", done: true },
      { label: "Notification system", done: true },
      { label: "Role-based access (Admin/Researcher/Viewer)", done: true },
      { label: "Audit log system", done: true },
    ],
  },
  {
    phase: 2,
    title: "Research Platform",
    subtitle: "Explainable AI, biomarker discovery, multi-model support",
    status: "active",
    eta: "In Progress — Jun 2026",
    color: "border-blue-300 bg-blue-50/50 dark:bg-blue-900/5 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    items: [
      { label: "Explainable AI module (SHAP-style)", done: true },
      { label: "7-model comparison framework", done: true },
      { label: "UMAP clustering visualisation", done: true },
      { label: "Drug sensitivity research explorer", done: true },
      { label: "Sample comparison with similarity scoring", done: true },
      { label: "Biomarker ranking and export", done: true },
      { label: "Pathway analysis (KEGG + GO terms)", done: true },
      { label: "Gene library with mutation type data", done: true },
      { label: "Model versioning system", done: false },
      { label: "Real-time model training (server-side Python)", done: false },
      { label: "Full SHAP integration via Python microservice", done: false },
    ],
  },
  {
    phase: 3,
    title: "Startup MVP",
    subtitle: "Real authentication, cloud database, API access tier",
    status: "planned",
    eta: "Target — Q1 2027",
    color: "border-amber-300 bg-amber-50/50 dark:bg-amber-900/5 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    items: [
      { label: "Real user authentication (Replit Auth / Clerk)", done: false },
      { label: "Cloud PostgreSQL (Neon / Supabase)", done: false },
      { label: "Team workspaces and collaboration", done: false },
      { label: "External API access with rate limiting", done: false },
      { label: "Paid research accounts and billing", done: false },
      { label: "Institutional dashboard (multi-lab)", done: false },
      { label: "PDF report export", done: false },
      { label: "WebSocket real-time pipeline updates", done: false },
      { label: "TCGA / GEO live dataset integration", done: false },
      { label: "Docker containerisation + CI/CD", done: false },
    ],
  },
  {
    phase: 4,
    title: "Advanced Product",
    subtitle: "Multi-omics, PPI networks, enterprise deployment",
    status: "future",
    eta: "Target — 2028+",
    color: "border-dashed border-gray-300 dark:border-gray-700",
    badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    items: [
      { label: "Multi-omics integration (RNA-seq, ATAC-seq, proteomics)", done: false },
      { label: "PPI network graph visualisation (STRING DB)", done: false },
      { label: "External dataset validation pipeline", done: false },
      { label: "Lab collaboration tools and shared workspaces", done: false },
      { label: "Enterprise on-premise deployment package", done: false },
      { label: "Federated learning for privacy-preserving training", done: false },
      { label: "GNN model with real PPI graph features", done: false },
      { label: "Mobile companion app for result review", done: false },
      { label: "Integration with EHR systems (FHIR)", done: false },
      { label: "Published research paper on GNN-AE method", done: false },
    ],
  },
];

const STATUS_ICON: Record<PhaseStatus, React.ReactNode> = {
  complete: <CheckCircle className="w-5 h-5 text-green-500" />,
  active:   <Clock className="w-5 h-5 text-blue-500" />,
  planned:  <Circle className="w-5 h-5 text-amber-500" />,
  future:   <Circle className="w-5 h-5 text-gray-400" />,
};

export default function Roadmap() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Product Roadmap</h1>
          <p className="text-muted-foreground text-sm">
            Four-phase journey from Final Year Project prototype to a research SaaS platform and enterprise product.
          </p>
        </div>

        {/* Status legend */}
        <div className="flex items-center gap-5 text-sm">
          {[
            { icon: <CheckCircle className="w-4 h-4 text-green-500" />, label: "Complete" },
            { icon: <Clock className="w-4 h-4 text-blue-500" />, label: "In Progress" },
            { icon: <Circle className="w-4 h-4 text-amber-500" />, label: "Planned" },
            { icon: <Circle className="w-4 h-4 text-gray-400" />, label: "Future" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 text-muted-foreground">
              {s.icon}<span>{s.label}</span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-4">
          {PHASES.map(phase => {
            const doneCount = phase.items.filter(i => i.done).length;
            const pct = Math.round((doneCount / phase.items.length) * 100);
            return (
              <Card key={phase.phase} className={`border ${phase.color}`}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">{STATUS_ICON[phase.status]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">Phase {phase.phase}: {phase.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${phase.badge}`}>
                          {phase.eta}
                        </span>
                        {phase.status === "active" && (
                          <Badge className="bg-blue-500 text-white border-0 text-[10px]">
                            <Rocket className="w-2.5 h-2.5 mr-1" />Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{phase.subtitle}</p>

                      {/* Progress bar */}
                      <div className="mt-3 mb-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{doneCount} / {phase.items.length} complete</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary">
                          <div
                            className="h-1.5 rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                        {phase.items.map(item => (
                          <div key={item.label} className="flex items-start gap-2 text-sm">
                            {item.done
                              ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                              : <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                            }
                            <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className="text-sm font-bold mb-2">Current Focus</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Phase 2 is actively under development. The platform is feature-complete for FYP submission and can be demonstrated as a working research prototype.</p>
                <p className="mt-1">Remaining Phase 2 items (server-side ML training, full SHAP) are the primary engineering tasks before the Phase 3 startup MVP sprint.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className="text-sm font-bold mb-2">Funding Strategy</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Phase 3 requires seed funding or grant support. Target sources include UKRI Smart Grants, Cancer Research UK Innovation Awards, and university spinout investment.</p>
                <p className="mt-1">The platform's research value proposition aligns with NHS AI adoption priorities and precision medicine initiatives.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className="text-sm font-bold mb-2">Revenue Model (Phase 3+)</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>· Free: FYP / student accounts</div>
                <div>· Researcher: £49/mo — datasets, models, reports</div>
                <div>· Lab: £299/mo — team workspace, API access</div>
                <div>· Enterprise: Custom — on-premise, SLA, support</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3">
          <Button size="sm" asChild>
            <Link href="/overview">Project Overview <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/architecture">Technical Architecture <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
