import { useState } from "react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CSVLink } from "react-csv";
import { Download, Crown, Zap, Shield, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { CHART_COLOR_LIST, CHART_COLORS, CustomTooltip, CustomLegend, formatPercent } from "@/lib/constants";

interface ModelResult {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
  cvScore: number;
  trainTime: number;
  testTime: number;
  version: string;
  status: "active" | "trained" | "deprecated";
}

const MODELS: ModelResult[] = [
  { name: "GNN-AE",              accuracy: 0.924, precision: 0.921, recall: 0.918, f1: 0.919, auc: 0.978, cvScore: 0.912, trainTime: 312, testTime: 4.1, version: "v2.4.1", status: "active"     },
  { name: "Neural Network",      accuracy: 0.901, precision: 0.898, recall: 0.895, f1: 0.896, auc: 0.961, cvScore: 0.889, trainTime: 187, testTime: 2.8, version: "v1.3.0", status: "trained"    },
  { name: "Gradient Boosting",   accuracy: 0.884, precision: 0.881, recall: 0.879, f1: 0.880, auc: 0.952, cvScore: 0.876, trainTime: 94,  testTime: 1.2, version: "v1.1.2", status: "trained"    },
  { name: "Random Forest",       accuracy: 0.871, precision: 0.868, recall: 0.866, f1: 0.867, auc: 0.944, cvScore: 0.863, trainTime: 52,  testTime: 0.8, version: "v1.2.1", status: "trained"    },
  { name: "Support Vector Machine", accuracy: 0.856, precision: 0.853, recall: 0.850, f1: 0.851, auc: 0.931, cvScore: 0.848, trainTime: 41, testTime: 0.6, version: "v1.0.3", status: "trained" },
  { name: "Logistic Regression", accuracy: 0.812, precision: 0.809, recall: 0.806, f1: 0.807, auc: 0.901, cvScore: 0.803, trainTime: 8,   testTime: 0.2, version: "v1.0.1", status: "deprecated" },
  { name: "Autoencoder (AE)",    accuracy: 0.847, precision: 0.844, recall: 0.841, f1: 0.842, auc: 0.921, cvScore: 0.839, trainTime: 134, testTime: 1.9, version: "v1.1.0", status: "trained"    },
];

const METRICS: (keyof ModelResult)[] = ["accuracy", "precision", "recall", "f1", "auc", "cvScore"];
const METRIC_LABELS: Record<string, string> = { accuracy: "Accuracy", precision: "Precision", recall: "Recall", f1: "F1-Score", auc: "ROC-AUC", cvScore: "CV Score" };

const statusStyles: Record<string, string> = {
  active:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  trained:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  deprecated: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

function getBest(metric: keyof ModelResult) {
  return MODELS.reduce((best, m) => (m[metric] as number) > (best[metric] as number) ? m : best).name;
}

export default function ModelComparison() {
  const [sortBy, setSortBy] = useState<keyof ModelResult>("f1");

  const sorted = [...MODELS].sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));

  const barData = MODELS.map((m, i) => ({
    name: m.name.replace(" Machine", "").replace("Gradient ", "GB "),
    Accuracy: parseFloat((m.accuracy * 100).toFixed(1)),
    "F1-Score": parseFloat((m.f1 * 100).toFixed(1)),
    "ROC-AUC": parseFloat((m.auc * 100).toFixed(1)),
  }));

  const radarData = METRICS.map(metric => ({
    subject: METRIC_LABELS[metric],
    "GNN-AE": parseFloat(((MODELS[0][metric] as number) * 100).toFixed(1)),
    "Neural Net": parseFloat(((MODELS[1][metric] as number) * 100).toFixed(1)),
    "Grad. Boost": parseFloat(((MODELS[2][metric] as number) * 100).toFixed(1)),
    "Random Forest": parseFloat(((MODELS[3][metric] as number) * 100).toFixed(1)),
  }));

  const bestAccuracy = getBest("accuracy");
  const bestF1 = getBest("f1");
  const fastestModel = MODELS.reduce((f, m) => m.trainTime < f.trainTime ? m : f).name;
  const bestAUC = getBest("auc");

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Model Comparison"
          subtitle="Side-by-side evaluation of all trained models across accuracy, F1, AUC, speed, and cross-validation scores."
        />

        {/* Best-in-class cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Crown,  label: "Best Overall",  value: bestAccuracy,  desc: `Acc: ${formatPercent(MODELS.find(m=>m.name===bestAccuracy)!.accuracy*100)}`, color: "text-amber-500" },
            { icon: Target, label: "Best F1-Score", value: bestF1,        desc: `F1: ${formatPercent(MODELS.find(m=>m.name===bestF1)!.f1*100)}`,             color: "text-blue-500"  },
            { icon: Zap,    label: "Fastest Train", value: fastestModel,  desc: `${MODELS.find(m=>m.name===fastestModel)!.trainTime}s training`,            color: "text-green-500" },
            { icon: Shield, label: "Best AUC",      value: bestAUC,       desc: `AUC: ${formatPercent(MODELS.find(m=>m.name===bestAUC)!.auc*100)}`,          color: "text-purple-500" },
          ].map(c => (
            <Card key={c.label} className="border-border/60">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <c.icon className={`w-4 h-4 ${c.color}`} />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{c.label}</span>
                </div>
                <div className="text-sm font-bold leading-tight">{c.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5 font-mono">{c.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recommendation */}
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/5 dark:border-green-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold">Recommended Model: GNN-AE v2.4.1</div>
                <p className="text-xs text-muted-foreground mt-1">
                  GNN-AE achieves the highest accuracy (92.4%), F1-score (91.9%), and ROC-AUC (97.8%) across all
                  five cancer subtypes. While training time is longer than simpler models, the significant performance
                  gain justifies its use for research-grade classification. Use Random Forest for rapid prototyping
                  where training speed is critical.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar chart */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-base">Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300} debounce={0}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" fontSize={10} opacity={0.7} />
                  <YAxis domain={[75, 100]} fontSize={11} opacity={0.7} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} />
                  <Legend content={<CustomLegend />} />
                  <Bar dataKey="Accuracy"   fill={CHART_COLOR_LIST[0]} radius={[4,4,0,0]} isAnimationActive={false} />
                  <Bar dataKey="F1-Score"   fill={CHART_COLOR_LIST[1]} radius={[4,4,0,0]} isAnimationActive={false} />
                  <Bar dataKey="ROC-AUC"    fill={CHART_COLOR_LIST[2]} radius={[4,4,0,0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Radar chart */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-base">Multi-Metric Radar — Top 4 Models</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300} debounce={0}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="currentColor" opacity={0.15} />
                  <PolarAngleAxis dataKey="subject" fontSize={11} />
                  <Radar name="GNN-AE"        dataKey="GNN-AE"        stroke={CHART_COLOR_LIST[0]} fill={CHART_COLOR_LIST[0]} fillOpacity={0.15} isAnimationActive={false} />
                  <Radar name="Neural Net"    dataKey="Neural Net"    stroke={CHART_COLOR_LIST[1]} fill={CHART_COLOR_LIST[1]} fillOpacity={0.10} isAnimationActive={false} />
                  <Radar name="Grad. Boost"   dataKey="Grad. Boost"   stroke={CHART_COLOR_LIST[2]} fill={CHART_COLOR_LIST[2]} fillOpacity={0.10} isAnimationActive={false} />
                  <Radar name="Random Forest" dataKey="Random Forest" stroke={CHART_COLOR_LIST[3]} fill={CHART_COLOR_LIST[3]} fillOpacity={0.10} isAnimationActive={false} />
                  <Legend content={<CustomLegend />} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Full comparison table */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Full Model Comparison Table</CardTitle>
            <CSVLink data={MODELS} filename="model-comparison.csv"
              className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground">
              <Download className="w-3.5 h-3.5" />
            </CSVLink>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => setSortBy("accuracy")}>
                      Accuracy {sortBy === "accuracy" && "▼"}
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => setSortBy("precision")}>
                      Precision {sortBy === "precision" && "▼"}
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => setSortBy("recall")}>
                      Recall {sortBy === "recall" && "▼"}
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => setSortBy("f1")}>
                      F1-Score {sortBy === "f1" && "▼"}
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => setSortBy("auc")}>
                      ROC-AUC {sortBy === "auc" && "▼"}
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => setSortBy("cvScore")}>
                      CV Score {sortBy === "cvScore" && "▼"}
                    </TableHead>
                    <TableHead className="text-right">Train (s)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((m, i) => (
                    <TableRow key={m.name} className={m.status === "active" ? "bg-primary/5" : ""}>
                      <TableCell className="font-semibold text-sm flex items-center gap-1.5">
                        {i === 0 && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                        {m.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{m.version}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusStyles[m.status]}`}>{m.status}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatPercent(m.accuracy * 100)}</TableCell>
                      <TableCell className="text-right font-mono">{formatPercent(m.precision * 100)}</TableCell>
                      <TableCell className="text-right font-mono">{formatPercent(m.recall * 100)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-primary">{formatPercent(m.f1 * 100)}</TableCell>
                      <TableCell className="text-right font-mono">{formatPercent(m.auc * 100)}</TableCell>
                      <TableCell className="text-right font-mono">{formatPercent(m.cvScore * 100)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{m.trainTime}s</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Click column headers to sort. Metrics averaged over 5-fold cross-validation on TCGA held-out test set.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
