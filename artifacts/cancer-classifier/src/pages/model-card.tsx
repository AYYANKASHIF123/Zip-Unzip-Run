import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ClipboardList, Target, Database, Scale, AlertTriangle, ShieldAlert,
  Gauge, Users, CalendarClock, GitBranch,
} from "lucide-react";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold mb-2 flex items-center gap-2">{children}</h2>;
}

const METRICS = [
  { label: "Accuracy",  value: "92.4%" },
  { label: "Precision (macro)", value: "91.8%" },
  { label: "Recall (macro)",    value: "90.6%" },
  { label: "F1 Score (macro)",  value: "91.2%" },
];

const SUBTYPES = [
  { code: "BRCA", name: "Breast Invasive Carcinoma" },
  { code: "LUAD", name: "Lung Adenocarcinoma" },
  { code: "COAD", name: "Colon Adenocarcinoma" },
  { code: "GBM",  name: "Glioblastoma Multiforme" },
  { code: "PRAD", name: "Prostate Adenocarcinoma" },
];

export default function ModelCard() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1100px] mx-auto space-y-8">

        {/* Hero */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 font-medium">Model Card v1.0</Badge>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 font-medium">Research Prototype — Not Clinically Validated</Badge>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Model Card — Random Forest Cancer Subtype Classifier</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                Following the Model Cards for Model Reporting framework (Mitchell et al., 2019), this document summarises
                what the deployed model is, how it was trained, how it performs, and — critically — what it should
                <strong> not</strong> be used for.
              </p>
            </div>
          </div>
        </div>

        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-800 dark:text-red-300">
            <strong>Not a medical device.</strong> This model is an academic Final Year Project prototype trained on a
            small, class-balanced demonstration dataset. It has not undergone clinical validation, regulatory review,
            or external cohort testing, and must never be used to inform real patient care or treatment decisions.
          </AlertDescription>
        </Alert>

        <Separator />

        {/* Overview grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <SectionTitle><Target className="w-4 h-4 text-primary" />Model Details</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Architecture", "Random Forest (scikit-learn), 200 trees"],
                ["Version", "RandomForest v1.0"],
                ["Input", "50-gene expression vector (z-score normalised)"],
                ["Output", "5-class subtype probability distribution"],
                ["Training framework", "Python 3.11, scikit-learn, FastAPI"],
                ["License / status", "Internal research use only"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/50 py-1.5 last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <SectionTitle><Database className="w-4 h-4 text-primary" />Training Data</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                Trained on a synthetic, class-balanced 50-gene expression panel derived from TCGA Pan-Cancer Atlas gene
                signatures, generated to approximate real subtype-specific expression patterns for demonstration purposes.
              </p>
              <div className="flex justify-between border-t border-border/50 pt-2 mt-2">
                <span>Samples per class</span><span className="font-medium text-foreground">~200 (balanced)</span>
              </div>
              <div className="flex justify-between">
                <span>Train / test split</span><span className="font-medium text-foreground">80 / 20, stratified</span>
              </div>
              <div className="flex justify-between">
                <span>Feature count</span><span className="font-medium text-foreground">50 curated cancer genes</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance */}
        <div className="space-y-3">
          <SectionTitle><Gauge className="w-4 h-4 text-primary" />Performance</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {METRICS.map(m => (
              <Card key={m.label} className="text-center border-border/60">
                <CardContent className="pt-4 pb-3">
                  <div className="text-xl font-bold text-primary">{m.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Metrics computed on the held-out 20% synthetic test split. See the Model Performance page for the full
            confusion matrix and per-class breakdown.
          </p>
        </div>

        <Separator />

        {/* Intended use */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <SectionTitle><Users className="w-4 h-4 text-green-600" />Intended Use</SectionTitle>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• Educational demonstration of ML-driven genomics classification (FYP / coursework)</li>
              <li>• Prototyping and UX research for a future clinical decision-support tool</li>
              <li>• Benchmarking explainability techniques against a known ground truth</li>
            </ul>
          </div>
          <div className="space-y-2">
            <SectionTitle><AlertTriangle className="w-4 h-4 text-red-600" />Out-of-Scope Use</SectionTitle>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• Any real patient diagnosis, staging, or treatment planning</li>
              <li>• Deployment against real-world, non-synthetic clinical gene panels without revalidation</li>
              <li>• Regulatory submissions or insurance/claims decisioning</li>
            </ul>
          </div>
        </div>

        <Separator />

        {/* Subtypes covered */}
        <div className="space-y-3">
          <SectionTitle><GitBranch className="w-4 h-4 text-primary" />Supported Cancer Subtypes</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {SUBTYPES.map(s => (
              <Card key={s.code} className="border-border/60">
                <CardContent className="pt-3 pb-3 text-center">
                  <div className="text-sm font-bold text-primary">{s.code}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{s.name}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Ethical considerations / limitations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <SectionTitle><Scale className="w-4 h-4 text-amber-600" />Limitations</SectionTitle>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• Trained on synthetic/simulated data, not a real multi-institution patient cohort</li>
              <li>• 50-gene panel is a small subset of the ~20,000 genes typically profiled clinically</li>
              <li>• No external validation, no prospective clinical trial</li>
              <li>• Explainability scores are MDI + class-mean deltas, an approximation — not exact Shapley values</li>
            </ul>
          </div>
          <div className="space-y-2">
            <SectionTitle><ShieldAlert className="w-4 h-4 text-amber-600" />Ethical Considerations</SectionTitle>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• Synthetic training data was not sourced from identifiable patients</li>
              <li>• Demographic/subgroup fairness has not been formally audited</li>
              <li>• Any future clinical use requires IRB approval, real-world validation, and regulatory clearance</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
          <CalendarClock className="w-3.5 h-3.5" />
          Last updated: model v1.0, Final Year Project submission cycle 2026.
        </div>
      </div>
    </div>
  );
}
