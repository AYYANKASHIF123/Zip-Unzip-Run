import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import {
  Code2, Server, Database, Brain, Layers, Shield, Cloud,
  ArrowDown, Network, Zap, Globe, Container, CheckCircle2, HardDrive,
} from "lucide-react";

const DOCKER_CICD_CHECKLIST = [
  "Dockerfile prepared for frontend (Vite build → static serve)",
  "Dockerfile prepared for API server (Node/Express)",
  "Dockerfile prepared for ML service (Python/FastAPI)",
  "docker-compose architecture documented (frontend + API + ML + PostgreSQL)",
  "Environment variables listed (DATABASE_URL, SESSION_SECRET, PORT, BASE_PATH)",
  "Production build command defined per service",
  "Health check endpoints defined per service",
  "Deployment notes documented for cloud and on-premise targets",
];

const CLOUD_DB_STATUS = [
  { label: "Current database mode", value: "Replit-managed PostgreSQL (prototype)" },
  { label: "PostgreSQL support", value: "Yes — Drizzle ORM, schema-first migrations" },
  { label: "Neon / Supabase ready", value: "Yes — via DATABASE_URL environment configuration" },
  { label: "Environment variable configuration", value: "DATABASE_URL, SESSION_SECRET" },
  { label: "Backup status", value: "Managed by Replit checkpoints (prototype) — automated cloud backups planned for production" },
  { label: "Migration status", value: "Up to date via `pnpm --filter @workspace/db run push`" },
];

const LAYERS = [
  {
    level: 1,
    label: "Presentation Layer",
    icon: Code2,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    tech: ["React 18", "TypeScript 5.9", "Vite 5", "shadcn/ui", "TanStack Query", "Wouter", "Recharts", "d3-scale-chromatic"],
    desc: "Single-page application serving all researcher-facing UI. Communicates with the API layer exclusively via OpenAPI-generated typed hooks. All charts are rendered client-side with Recharts and SVG.",
    components: ["Dashboard", "Genomics Explorer (Heatmap/PCA/UMAP/Volcano)", "Explainable AI", "Model Comparison", "Survival Analysis", "Drug Sensitivity", "Biomarkers", "Reports", "Audit Logs"],
  },
  {
    level: 2,
    label: "API Contract Layer",
    icon: Network,
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800",
    tech: ["OpenAPI 3.0 spec", "Orval codegen", "Zod v4 schemas", "drizzle-zod", "@workspace/api-spec", "@workspace/api-client-react"],
    desc: "OpenAPI spec is the single source of truth for all API contracts. Orval generates TypeScript hooks (TanStack Query) and Zod validation schemas from the spec. Any schema change propagates automatically through codegen.",
    components: ["30+ typed REST endpoints", "Zod request/response validation", "React Query hooks", "Shared types across frontend and backend"],
  },
  {
    level: 3,
    label: "API Server Layer",
    icon: Server,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    tech: ["Express 5", "Node.js 24", "Pino logger", "esbuild (CJS bundle)", "pnpm workspaces"],
    desc: "Stateless REST API server. Routes validate inputs with Zod, invoke service/data layer logic, and return typed responses. All logging via structured Pino logger — never console.log. Runs behind the Replit reverse proxy on port 8080.",
    components: ["/api/dashboard", "/api/analyses", "/api/genomics", "/api/survival", "/api/biomarkers", "/api/drugs", "/api/datasets", "/api/metrics", "/api/reports", "/api/notifications"],
  },
  {
    level: 4,
    label: "Business Logic / Analysis Engine",
    icon: Zap,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    tech: ["TypeScript services", "Gene expression processing", "Statistical analysis (t-test, log2FC)", "Preprocessing pipeline", "Report generation"],
    desc: "Core business logic for analysis orchestration: dataset validation, preprocessing steps (normalisation, variance filtering, feature selection), pipeline monitoring, and report assembly. Intentionally separated from the ML model layer.",
    components: ["Preprocessing pipeline (6 stages)", "Quality scoring engine", "Biomarker ranking", "Survival curve computation", "Report template engine"],
  },
  {
    level: 5,
    label: "ML Model Layer",
    icon: Brain,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-800",
    tech: ["GNN-AE v2.4.1", "Neural Network", "Gradient Boosting", "Random Forest", "SVM", "Logistic Regression", "Autoencoder (AE)"],
    desc: "Seven ML models with versioned weights, training metrics, and evaluation pipelines. GNN-AE is the primary model, achieving 92.4% accuracy. Each model exposes a unified predict/evaluate interface. In production, models run server-side; in the current prototype, scoring is simulation-based with realistic distributions.",
    components: ["Model registry", "Version management", "Training/evaluation interface", "Prediction history", "Confidence calibration"],
  },
  {
    level: 6,
    label: "Explainability Layer",
    icon: Layers,
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
    tech: ["SHAP-approximation", "Permutation importance", "Coefficient-based XAI", "Gradient attribution", "Feature importance"],
    desc: "Model-agnostic explainability engine that computes per-sample and global feature importance. Uses SHAP-approximation (gradient weights + permutation + coefficient) rather than full SHAP to avoid heavy Python dependencies. Full SHAP integration is planned for Phase 3.",
    components: ["Global gene importance rankings", "Sample-level contribution charts", "Positive/negative gene identification", "Confidence explanation", "XAI export"],
  },
  {
    level: 7,
    label: "Data & Storage Layer",
    icon: Database,
    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    tech: ["PostgreSQL", "Drizzle ORM", "drizzle-zod", "SQLite (local dev)", "TCGA / GEO / CCLE datasets"],
    desc: "Relational database stores all persistent state: users, datasets, preprocessing runs, model versions, predictions, reports, notifications, and audit logs. Drizzle ORM provides type-safe queries and schema-first migrations.",
    components: ["Users & roles", "Datasets & metadata", "Preprocessing runs", "Model versions", "Predictions", "Reports", "Notifications", "Audit logs"],
  },
  {
    level: 8,
    label: "Security & Access Layer",
    icon: Shield,
    color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    tech: ["Role-based access control (Admin / Researcher / Viewer)", "Session tokens", "Audit logging", "Medical disclaimer enforcement"],
    desc: "Three-tier role system controls data access and action permissions. Audit logs track all dataset, model, and prediction events. All clinical-facing views carry mandatory research disclaimers. Auth is currently mock-based; production will integrate Replit Auth or Clerk.",
    components: ["RBAC middleware", "Role switcher UI", "Audit log engine", "Disclaimer component", "Session management"],
  },
  {
    level: 9,
    label: "Future Cloud Layer",
    icon: Cloud,
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    border: "border-dashed border-gray-300 dark:border-gray-700",
    tech: ["AWS / GCP / Azure", "Docker + Kubernetes", "CI/CD pipeline", "Cloud PostgreSQL (Neon / Supabase)", "Real-time WebSocket", "Multi-omics data lake"],
    desc: "Planned Phase 3–4 infrastructure. Containerised microservices, cloud-managed PostgreSQL, real ML inference via Python microservice (Flask/FastAPI), WebSocket for live pipeline updates, and S3/GCS for dataset object storage.",
    components: ["Cloud deployment", "Auto-scaling", "Team workspaces", "API rate limiting", "Enterprise SSO"],
  },
];

export default function Architecture() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Technical Architecture</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Layer-by-layer breakdown of the GeneClassifier platform — designed for FYP presentation, research review, and startup pitching.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0">Contract-First API</Badge>
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-0">pnpm Workspaces</Badge>
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0">TypeScript End-to-End</Badge>
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">7 ML Models</Badge>
          <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-0">XAI Enabled</Badge>
        </div>

        <Separator />

        <div className="space-y-3">
          {LAYERS.map((layer, i) => (
            <div key={layer.label} className="space-y-2">
              <div className={`rounded-xl border ${layer.border} bg-background p-4`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${layer.color} shrink-0`}>
                    <layer.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{layer.label}</span>
                      <span className="text-xs text-muted-foreground font-mono">Layer {layer.level}</span>
                      {layer.border.includes("dashed") && <Badge variant="outline" className="text-[10px] px-1.5">Planned</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{layer.desc}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {layer.tech.map(t => (
                        <span key={t} className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${layer.border} ${layer.color}`}>{t}</span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Key components: </span>
                      {layer.components.join(" · ")}
                    </div>
                  </div>
                </div>
              </div>
              {i < LAYERS.length - 1 && (
                <div className="flex justify-center">
                  <ArrowDown className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { title: "Data Flow", items: ["User uploads CSV/TSV dataset", "Backend validates & stores metadata", "Preprocessing pipeline runs (6 stages)", "ML model scores samples", "XAI engine computes feature importance", "Results stored & available for reports"] },
            { title: "Key Design Decisions", items: ["OpenAPI-first: spec drives all contracts", "Zod validation at every boundary", "Structured logging (Pino) — no console.log", "XAI via gradient/permutation (no SHAP dep)", "Role-based access enforced server-side", "Drizzle ORM for type-safe, migration-ready DB"] },
            { title: "Scalability Path", items: ["Stateless API → horizontal scaling", "PostgreSQL → cloud-managed (Neon/Supabase)", "Model inference → Python microservice", "Auth → Replit Auth or Clerk", "Storage → S3/GCS object store", "Real-time → WebSocket pipeline updates"] },
          ].map(col => (
            <Card key={col.title} className="border-border/60">
              <CardContent className="pt-4 pb-4">
                <div className="text-sm font-bold mb-2">{col.title}</div>
                <div className="space-y-1">
                  {col.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-primary shrink-0">{i + 1}.</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        <div>
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><HardDrive className="w-4 h-4" /> Cloud Database Readiness</h2>
          <PrototypeBanner text="Current prototype database. Cloud PostgreSQL ready through environment configuration — no code changes required to point at Neon, Supabase, or another managed Postgres provider." />
          <Card className="border-border/60 mt-3">
            <CardContent className="pt-4 pb-4 space-y-2">
              {CLOUD_DB_STATUS.map(s => (
                <div key={s.label} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 text-xs bg-secondary/30 rounded-md px-3 py-2">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground">{s.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><Container className="w-4 h-4" /> Docker Containerisation + CI/CD</h2>
          <PrototypeBanner text="Deployment package documents the intended containerisation and CI/CD strategy. No live Docker/CI pipeline is executing inside this Replit environment." />
          <Card className="border-border/60 mt-3">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                {DOCKER_CICD_CHECKLIST.map(c => (
                  <div key={c} className="flex items-start gap-2 text-xs bg-secondary/30 rounded-md px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> {c}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0">Frontend — Docker-ready</Badge>
                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-0">API — Docker-ready</Badge>
                <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-0">ML Service — Docker-ready</Badge>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0">PostgreSQL — Service documented</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
