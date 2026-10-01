import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dna, Brain, Target, Users, TrendingUp, Shield, Zap, BarChart3, Network,
  Database, FlaskConical, FileText, AlertTriangle, CheckCircle, ArrowRight,
  Microscope, Globe, Lightbulb, Code2, Server, Layers,
} from "lucide-react";

const STATS = [
  { label: "Cancer Subtypes", value: "5", color: "text-blue-500" },
  { label: "Model Input Genes", value: "50", color: "text-purple-500" },
  { label: "5-fold CV Accuracy", value: "86.52%", color: "text-green-500" },
  { label: "Training Samples", value: "3,330", color: "text-pink-500" },
  { label: "Active ML Model", value: "1", color: "text-amber-500" },
  { label: "Biomarkers Found", value: "15+", color: "text-cyan-500" },
];

const FEATURES = [
  { icon: Brain,      title: "AI Classification",       desc: "HistGradientBoosting v2 predicts five cancer subtypes from a curated 50-gene expression panel. Its 5-fold CV accuracy is 86.52% on real TCGA-derived training data." },
  { icon: Microscope, title: "Genomics Explorer",       desc: "Interactive heatmaps, PCA plots, UMAP clustering, and volcano plots for deep exploration of gene expression patterns." },
  { icon: BarChart3,  title: "Explainable AI",          desc: "Permutation importance and class-mean delta provide global gene rankings and approximate sample-level contribution context. This is not SHAP." },
  { icon: Target,     title: "Biomarker Discovery",     desc: "Statistical analysis to identify and rank potential biomarker candidates with p-value scoring and expression profiling." },
  { icon: FlaskConical,"title": "Drug Sensitivity",    desc: "Research-grade drug sensitivity exploration based on gene expression profiles, mapped against established drug-target databases." },
  { icon: Network,    title: "Survival Analysis",       desc: "Kaplan-Meier curves, median OS estimation, and gene-based survival grouping for all 5 supported cancer subtypes." },
  { icon: Database,   title: "Dataset Management",     desc: "Upload, validate, and manage CSV/TSV gene expression datasets with quality scoring and automated preprocessing pipelines." },
  { icon: FileText,   title: "Report Generation",       desc: "Export comprehensive analysis reports including metrics, biomarkers, predictions, and visualisations as PDF, CSV, or JSON." },
];

const USERS_LIST = [
  { icon: Microscope, role: "Researchers",        desc: "Upload gene expression data, run multi-model comparisons, discover biomarkers, and export research-grade reports." },
  { icon: Users,      role: "Students & FYP",     desc: "Understand AI-driven genomics analysis through interactive visualisations, step-by-step pipeline monitoring, and XAI." },
  { icon: Database,   role: "Research Labs",       desc: "Integrate institutional datasets, track analysis history, manage model versions, and collaborate via role-based access." },
  { icon: Globe,      role: "Medical Researchers", desc: "Explore gene expression patterns, survival data, and drug sensitivity correlations for hypothesis-driven research." },
];

const TECH_STACK = [
  { layer: "Frontend",        tech: "React 18 · TypeScript · Vite · shadcn/ui · Recharts · TanStack Query",  icon: Code2   },
  { layer: "API Layer",       tech: "Express 5 · OpenAPI 3.0 · Zod validation · Orval codegen",              icon: Server  },
  { layer: "Data Layer",      tech: "PostgreSQL · Drizzle ORM · Drizzle-Zod · SQLite (local dev)",           icon: Database },
  { layer: "ML Model",        tech: "HistGradientBoosting v2 · scikit-learn · FastAPI",                        icon: Brain   },
  { layer: "Explainability",  tech: "Permutation importance · Class-mean delta · Not SHAP",                     icon: Layers },
  { layer: "Infrastructure",  tech: "pnpm workspaces · Node 24 · TypeScript 5.9 · esbuild",                  icon: Zap     },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold mb-1">{children}</h2>;
}

export default function ProjectOverview() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1200px] mx-auto space-y-10">

        {/* Hero */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 font-medium">FYP Prototype</Badge>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-0 font-medium">Research Platform</Badge>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0 font-medium">Startup Ready</Badge>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 font-medium">Active Development</Badge>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Dna className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">GeneClassifier</h1>
              <p className="text-lg text-muted-foreground mt-1">
                AI-Powered Gene Expression Cancer Subtype Classification Platform
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                A bioinformatics research platform combining deep learning, explainable AI, and clinical genomics tools
                to classify cancer subtypes from high-dimensional gene expression data — built for researchers, students,
                and forward-thinking labs.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {STATS.map(s => (
              <Card key={s.label} className="text-center border-border/60">
                <CardContent className="pt-4 pb-3">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Problem Statement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <SectionTitle>The Problem</SectionTitle>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Cancer is not a single disease — it is hundreds of molecularly distinct diseases. Two patients with
              "breast cancer" may have completely different tumour biology, prognosis, and optimal treatment. Yet most
              clinical workflows still rely on histological classification rather than the molecular landscape.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Gene expression profiling produces datasets with <strong>20,000+ features per sample</strong> — far beyond
              human interpretive capacity. Traditional statistical methods fail to capture the non-linear relationships
              between genes, pathways, and cancer phenotype.
            </p>
            <div className="space-y-2 mt-2">
              {["High dimensionality: 20,531 genes per sample","Class imbalance across cancer subtypes","Lack of interpretable AI in genomics pipelines","Slow, costly, and inaccessible analysis tools"].map(p => (
                <div key={p} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <span className="text-muted-foreground">{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <SectionTitle>The Solution</SectionTitle>
            <p className="text-muted-foreground text-sm leading-relaxed">
              GeneClassifier provides an end-to-end research platform that handles gene expression data from raw upload
              through preprocessing, multi-model classification, explainability, biomarker discovery, and report
              generation — all within a clean, researcher-friendly interface.
            </p>
            <div className="space-y-2 mt-2">
              {[
                "HistGradientBoosting v2 trained on 3,330 real TCGA PanCancer Atlas samples",
                "86.52% 5-fold CV accuracy and 86.29% weighted F1",
                "Permutation importance + class-mean delta explanations (not SHAP)",
                "Interactive genomics visualisations (heatmap, PCA, UMAP, volcano)",
                "Integrated survival analysis and drug sensitivity research tools",
                "Automated preprocessing pipeline with quality scoring",
                "Full audit trail and role-based access control",
              ].map(s => (
                <div key={s} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Key Features */}
        <div className="space-y-4">
          <SectionTitle>Key Platform Features</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map(f => (
              <Card key={f.title} className="border-border/60 hover:border-primary/30 transition-colors">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <f.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold">{f.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Target Users */}
        <div className="space-y-4">
          <SectionTitle>Target Users</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {USERS_LIST.map(u => (
              <Card key={u.role} className="border-border/60">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <u.icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">{u.role}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{u.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Architecture */}
        <div className="space-y-4">
          <SectionTitle>Technical Architecture</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TECH_STACK.map(t => (
              <div key={t.layer} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-secondary/20">
                <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                  <t.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.layer}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.tech}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-right">
            <Button variant="outline" size="sm" asChild>
              <Link href="/architecture">Full Architecture Diagram <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Research Value + Startup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <SectionTitle>Research Value</SectionTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GeneClassifier bridges the gap between raw TCGA/GEO data and actionable research insights. It enables
              hypothesis generation, biomarker candidate ranking, and survival outcome correlation — all without
              requiring specialist bioinformatics programming knowledge.
            </p>
            <div className="space-y-1.5">
              {[
                "Reproducible analysis pipelines with full audit logs",
                "Multi-model comparison with cross-validation",
                "Exportable results for inclusion in papers and reports",
                "Integrable with TCGA, GEO, and GDC public datasets",
              ].map(i => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{i}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <SectionTitle>Startup Potential</SectionTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The global precision oncology market is projected to exceed <strong>$200 billion by 2030</strong>.
              GeneClassifier addresses a clear gap: accessible, explainable AI tooling for translational cancer research.
            </p>
            <div className="space-y-1.5">
              {[
                "SaaS pricing model for labs and institutions",
                "API access tier for bioinformatics pipelines",
                "Enterprise deployment with private cloud support",
                "Grant-ready: aligns with NIH, Cancer Research UK priorities",
              ].map(i => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <TrendingUp className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Current Status */}
        <div className="space-y-3">
          <SectionTitle>Current Prototype Status</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "Complete",     color: "bg-green-500",  items: ["Dashboard & analytics","Gene expression heatmap, PCA, UMAP","Kaplan-Meier survival analysis","Drug sensitivity explorer","Biomarker discovery","Pipeline monitor","Reports & notifications","Audit logs & role-based access"] },
              { label: "Research Prototype", color: "bg-amber-500", items: ["Real TCGA-derived training data for active HistGradientBoosting v2","Synthetic values used by sample-ID quick classify; use CSV upload for measured expression values","Exploratory dashboards and non-ML insights may contain demonstration data","No independent clinical validation or diagnosis use"] },
              { label: "Roadmap",      color: "bg-blue-500",   items: ["Real-time model training (server-side)","Multi-omics integration","Cloud PostgreSQL + auth","PPI network graph visualisation","Institutional dashboard & team workspaces"] },
            ].map(col => (
              <div key={col.label} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <span className="text-sm font-semibold">{col.label}</span>
                </div>
                <div className="space-y-1">
                  {col.items.map(i => (
                    <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-1">·</span><span>{i}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            <Button size="sm" asChild><Link href="/roadmap">View Full Roadmap <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link></Button>
            <Button size="sm" variant="outline" asChild><Link href="/">Go to Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link></Button>
          </div>
        </div>

        <Separator />

        {/* Ethical Disclaimer */}
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Medical & Ethical Disclaimer:</strong> GeneClassifier is a research and education platform.
            It is not a medical device and must not be used to diagnose cancer, replace clinical judgement, or make
            treatment decisions. All predictions, biomarker candidates, drug sensitivity scores, and survival estimates
            are <em>research outputs only</em> and require validation by qualified medical professionals before any
            clinical consideration. This platform is intended for use by trained researchers and students in an
            academic context. Always consult a licensed oncologist for medical advice.
          </AlertDescription>
        </Alert>

        <div className="text-xs text-muted-foreground text-center pb-4">
          GeneClassifier v2.4.1 · Final Year Project · Genomics Research Lab · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
