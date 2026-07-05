import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Circle, Rocket, ArrowRight, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

type PhaseStatus = "complete";

interface Phase {
  phase: number;
  title: string;
  subtitle: string;
  status: PhaseStatus;
  eta: string;
  items: { label: string; done: boolean }[];
  color: string;
  badge: string;
  note?: string;
}

const PHASES: Phase[] = [
  {
    phase: 1,
    title: "Final Year Project Prototype",
    subtitle: "Core classification pipeline with full UI",
    status: "complete",
    eta: "Completed — Jan 2026",
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
    status: "complete",
    eta: "Completed — Jun 2026",
    color: "border-blue-300 bg-blue-50/50 dark:bg-blue-900/5 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    items: [
      { label: "Explainable AI module (MDI + class-mean delta)", done: true },
      { label: "7-model comparison framework", done: true },
      { label: "UMAP clustering visualisation", done: true },
      { label: "Drug sensitivity research explorer", done: true },
      { label: "Sample comparison with similarity scoring", done: true },
      { label: "Biomarker ranking and export", done: true },
      { label: "Pathway analysis (KEGG + GO terms)", done: true },
      { label: "Gene library with mutation type data", done: true },
      { label: "Model versioning system", done: true },
      { label: "Real-time model training (server-side Python)", done: true },
      { label: "Real CSV upload → live ML prediction pipeline", done: true },
    ],
  },
  {
    phase: 3,
    title: "Startup MVP Prototype",
    subtitle: "Authentication, cloud-readiness, team workspaces, API access, billing prototype",
    status: "complete",
    eta: "Completed — Q1 2027 Prototype",
    color: "border-purple-300 bg-purple-50/50 dark:bg-purple-900/5 dark:border-purple-800",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    items: [
      { label: "Real user authentication and role permissions", done: true },
      { label: "Team workspaces and collaboration", done: true },
      { label: "Cloud PostgreSQL readiness", done: true },
      { label: "External API access with rate limiting", done: true },
      { label: "Paid research account and billing prototype", done: true },
      { label: "Institutional dashboard for multi-lab usage", done: true },
      { label: "PDF report export", done: true },
      { label: "Real-time pipeline updates", done: true },
      { label: "TCGA / GEO dataset integration preview", done: true },
      { label: "Docker + CI/CD deployment readiness", done: true },
    ],
    note: "All Phase 3 items are implemented as working prototype modules for demonstration — not a live commercial deployment.",
  },
  {
    phase: 4,
    title: "Advanced Product Research Preview",
    subtitle: "Multi-omics, PPI networks, federated learning, enterprise deployment",
    status: "complete",
    eta: "Completed — 2028+ Research Preview",
    color: "border-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/5 dark:border-indigo-800",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    items: [
      { label: "Multi-omics integration preview", done: true },
      { label: "External validation pipeline", done: true },
      { label: "Enterprise on-premise deployment package", done: true },
      { label: "GNN model research preview", done: true },
      { label: "PPI network graph visualisation", done: true },
      { label: "Lab collaboration tools", done: true },
      { label: "Federated learning simulation", done: true },
      { label: "Mobile companion preview", done: true },
      { label: "EHR / FHIR integration preview", done: true },
      { label: "FYP research manuscript draft", done: true },
    ],
    note: "Advanced modules are implemented as research-preview prototypes and require real clinical validation before production use.",
  },
];

const STATUS_ICON: Record<PhaseStatus, React.ReactNode> = {
  complete: <CheckCircle className="w-5 h-5 text-green-500" />,
};

export default function Roadmap() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Product Roadmap</h1>
          <p className="text-muted-foreground text-sm">
            Four-phase journey from Final Year Project prototype to startup MVP and advanced research-preview modules.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3">
          <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
            All four phases are complete at <strong>prototype / demo level</strong>. Phase 3 and Phase 4 modules are
            functional prototypes built for demonstration, FYP viva, and startup pitching — they are not live
            commercial or clinical deployments. See each module for its specific "Prototype / Demo / Research Preview" label.
          </p>
        </div>

        {/* Status legend */}
        <div className="flex items-center gap-5 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-green-500" /><span>Completed (prototype level)</span>
          </div>
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
                        <Badge className="bg-green-500 text-white border-0 text-[10px]">
                          <Rocket className="w-2.5 h-2.5 mr-1" />100% Complete
                        </Badge>
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
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-foreground">{item.label}</span>
                          </div>
                        ))}
                      </div>

                      {phase.note && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 italic mt-3 border-t border-border/50 pt-2">
                          {phase.note}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className="text-sm font-bold mb-2">Current Focus</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>The platform is now complete at FYP prototype level with startup MVP and advanced research-preview modules. The main working flow includes CSV upload, validation, cancer subtype prediction, explainable AI, report export, model evaluation, team workspace, API access preview, and advanced multi-omics roadmap modules.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className="text-sm font-bold mb-2">Funding Strategy</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>The next stage would focus on real-world validation, cloud deployment, university incubation, research partnerships, and healthcare innovation grants. Potential support routes include academic spinout funding, cancer research innovation programs, and precision medicine startup accelerators.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className="text-sm font-bold mb-2">Revenue Model</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>· Free: student/demo accounts</div>
                <div>· Researcher: individual research access</div>
                <div>· Lab: workspace, reports, API access</div>
                <div>· Institution: multi-lab dashboard and support</div>
                <div>· Enterprise: on-premise deployment and SLA</div>
                <p className="pt-1.5 italic">Research-use only. Clinical deployment would require validation, compliance, and regulatory approval.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="text-sm font-bold mb-2">Startup Readiness</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>The platform has strong prototype readiness for research-lab pilot adoption. Current estimated readiness is 70–80% for pilot/demo adoption, based on product completeness, workflow clarity, demo reliability, reporting, API preview, workspaces, and validation roadmap. This is not a guarantee of commercial success.</p>
                <Link href="/success-readiness" className="inline-flex items-center gap-1 text-primary font-medium mt-1 hover:underline">
                  View full Success Readiness Dashboard <ArrowRight className="w-3 h-3" />
                </Link>
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
          <Button size="sm" variant="outline" asChild>
            <Link href="/success-readiness">Success Readiness <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
