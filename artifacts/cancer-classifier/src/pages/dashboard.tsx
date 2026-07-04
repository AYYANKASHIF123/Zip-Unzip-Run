import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetDashboardSummary, useCreateAnalysis, useGetAnalysis } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatPercent, formatCompact, CHART_COLOR_LIST, CustomTooltip, CustomLegend } from "@/lib/constants";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CSVLink } from "react-csv";
import { Download, AlertTriangle, CheckCircle, Activity, Cpu, Zap, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PLATFORM_STATS = [
  { label: "Total Analyses",     value: 12,      color: "text-primary"    },
  { label: "Samples Analyzed",   value: "1,650+",color: "text-blue-500"   },
  { label: "Genes Processed",    value: "20.5k", color: "text-purple-500" },
  { label: "Cancer Types",       value: 5,       color: "text-pink-500"   },
  { label: "Datasets",           value: 8,       color: "text-amber-500"  },
  { label: "Models Trained",     value: 7,       color: "text-cyan-500"   },
];

const WARNINGS = [
  { type: "warning", msg: "Dataset GEO-GSE29210: 12 missing values detected in feature matrix." },
  { type: "warning", msg: "Sample TCGA-BH-A0B3: Low confidence prediction (54.2%) — manual review recommended." },
  { type: "info",    msg: "Pipeline last run: May 22, 08:30 — all 6 stages completed successfully." },
  { type: "info",    msg: "Model GNN-AE v2.4.1 is active and accepting prediction requests." },
];

const MODEL_PERF = [
  { model: "GNN-AE",        accuracy: 92.4, f1: 91.9, auc: 97.8 },
  { model: "Neural Net",    accuracy: 90.1, f1: 89.6, auc: 96.1 },
  { model: "Grad. Boost",   accuracy: 88.4, f1: 88.0, auc: 95.2 },
  { model: "Random Forest", accuracy: 87.1, f1: 86.7, auc: 94.4 },
];

const PIPELINE_STAGES = [
  { label: "Data Ingestion",       pct: 100, status: "done"   },
  { label: "Preprocessing & QC",  pct: 100, status: "done"   },
  { label: "Feature Extraction",  pct: 100, status: "done"   },
  { label: "Model Training",       pct: 100, status: "done"   },
  { label: "Evaluation",           pct: 100, status: "done"   },
  { label: "Inference API",        pct: 100, status: "done"   },
];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, dataUpdatedAt } = useGetDashboardSummary();
  const loading = isLoading || isFetching;
  const [, navigate] = useLocation();

  // ── Quick Classify ────────────────────────────────────────────────────────
  const [quickSampleId, setQuickSampleId] = useState("");
  const [quickDataSource, setQuickDataSource] = useState("TCGA");
  const [pollingId, setPollingId] = useState<number | null>(null);
  const createAnalysis = useCreateAnalysis();

  const { data: polledAnalysis } = useGetAnalysis(pollingId!, {
    query: {
      enabled: pollingId !== null,
      refetchInterval: pollingId !== null ? 2000 : false,
    },
  } as never);

  useEffect(() => {
    const status = (polledAnalysis as Record<string, unknown> | undefined)?.status;
    if (status === "completed" && pollingId !== null) {
      const id = pollingId;
      setPollingId(null);
      navigate(`/results/${id}`);
    } else if (status === "failed") {
      setPollingId(null);
    }
  }, [polledAnalysis, pollingId, navigate]);

  const handleQuickClassify = async () => {
    const sid = quickSampleId.trim();
    if (!sid || createAnalysis.isPending || pollingId !== null) return;
    try {
      const result = await createAnalysis.mutateAsync({ data: { sampleId: sid, dataSource: quickDataSource } });
      setPollingId((result as unknown as Record<string, unknown>).id as number);
      setQuickSampleId("");
    } catch { /* surface nothing */ }
  };

  const isClassifying = createAnalysis.isPending || pollingId !== null;

  const lastRefreshed = useMemo(() => {
    if (!dataUpdatedAt) return null;
    const d = new Date(dataUpdatedAt);
    return `${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()} on ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }, [dataUpdatedAt]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
  };

  const statusColors: Record<string, string> = {
    completed:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending:    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    failed:     "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="min-h-screen bg-background px-5 py-4 pt-[32px] pb-[32px] pl-[24px] pr-[24px]">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Dashboard Overview"
          subtitle="Real-time gene expression analysis and classification metrics."
          lastRefreshed={lastRefreshed}
          loading={loading}
          onRefresh={handleRefresh}
        />

        {/* Warnings */}
        <div className="space-y-1.5">
          {WARNINGS.map((w, i) => (
            <Alert key={i} className={w.type === "warning"
              ? "border-amber-200 bg-amber-50/70 dark:bg-amber-900/10 dark:border-amber-800 py-2"
              : "border-blue-100 bg-blue-50/50 dark:bg-blue-900/5 dark:border-blue-900 py-2"}>
              {w.type === "warning"
                ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                : <CheckCircle className="h-3.5 w-3.5 text-blue-500" />}
              <AlertDescription className={`text-xs ${w.type === "warning" ? "text-amber-800 dark:text-amber-300" : "text-blue-800 dark:text-blue-300"}`}>
                {w.msg}
              </AlertDescription>
            </Alert>
          ))}
        </div>

        {/* Main KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Total Analyses"  value={data?.totalAnalyses ?? 0}  loading={loading} />
          <KPICard title="Completed"       value={data?.completedAnalyses ?? 0} loading={loading} color="#009118" />
          <KPICard title="Model Accuracy"  value={data ? formatPercent(data.overallAccuracy * 100) : "0%"} loading={loading} />
          <KPICard title="Biomarkers Found" value={data ? formatCompact(data.totalBiomarkersFound) : 0} loading={loading} color="#795EFF" />
        </div>

        {/* Quick Classify */}
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex items-center gap-2 shrink-0 mb-1 sm:mb-0 sm:pb-0.5">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Quick Classify</span>
              </div>

              <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="qs-id" className="text-xs text-muted-foreground">Sample ID</Label>
                  <Input
                    id="qs-id"
                    placeholder="e.g. TCGA-A7-A0CE"
                    value={quickSampleId}
                    onChange={e => setQuickSampleId(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleQuickClassify()}
                    disabled={isClassifying}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="w-full sm:w-[140px] space-y-1">
                  <Label htmlFor="qs-src" className="text-xs text-muted-foreground">Data Source</Label>
                  <Select value={quickDataSource} onValueChange={setQuickDataSource} disabled={isClassifying}>
                    <SelectTrigger id="qs-src" className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["TCGA", "GEO", "CCLE", "cBioPortal", "Custom"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleQuickClassify}
                  disabled={!quickSampleId.trim() || isClassifying}
                  size="sm"
                  className="h-8 shrink-0 gap-1.5"
                >
                  {isClassifying ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Classifying…</>
                  ) : (
                    <><Zap className="w-3.5 h-3.5" /> Classify</>
                  )}
                </Button>
              </div>

              {isClassifying && (
                <p className="text-xs text-muted-foreground sm:pb-0.5 shrink-0">
                  Running ML prediction — redirecting when done…
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Platform stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {PLATFORM_STATS.map(s => (
            <Card key={s.label} className="text-center border-border/60">
              <CardContent className="pt-3 pb-3">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Subtype distribution */}
          <Card className="lg:col-span-1">
            <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Subtype Distribution</CardTitle>
              {!loading && data?.subtypeDistribution && data.subtypeDistribution.length > 0 && (
                <CSVLink data={data.subtypeDistribution} filename="subtype-distribution.csv"
                  className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground">
                  <Download className="w-3.5 h-3.5" />
                </CSVLink>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="w-full h-[280px]" />
              ) : (
                <ResponsiveContainer width="100%" height={280} debounce={0}>
                  <PieChart>
                    <Pie data={data?.subtypeDistribution ?? []} dataKey="count" nameKey="name"
                      cx="50%" cy="50%" outerRadius={95} innerRadius={55}
                      cornerRadius={2} paddingAngle={2} isAnimationActive={false} stroke="none">
                      {data?.subtypeDistribution?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLOR_LIST[index % CHART_COLOR_LIST.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                    <Legend content={<CustomLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent analyses */}
          <Card className="lg:col-span-2">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-base">Recent Analyses</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sample ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Subtype</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.recentAnalyses?.map((analysis) => (
                        <TableRow key={analysis.id}>
                          <TableCell className="font-medium text-sm">{analysis.sampleId}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${statusColors[analysis.status]} border-0 font-medium capitalize`}>
                              {analysis.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{analysis.cancerSubtype || "-"}</TableCell>
                          <TableCell className="text-sm">
                            {analysis.confidenceScore ? formatPercent(analysis.confidenceScore * 100) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {analysis.status === "completed" && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/results/${analysis.id}`}>View Results</Link>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!data?.recentAnalyses || data.recentAnalyses.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No recent analyses found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Model performance summary */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Model Performance Summary
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link href="/model-comparison">Compare All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220} debounce={0}>
                <BarChart data={MODEL_PERF}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="model" fontSize={10} opacity={0.7} />
                  <YAxis domain={[80, 100]} fontSize={11} opacity={0.7} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} />
                  <Legend content={<CustomLegend />} />
                  <Bar dataKey="accuracy" name="Accuracy"  fill={CHART_COLOR_LIST[0]} radius={[4,4,0,0]} isAnimationActive={false} />
                  <Bar dataKey="f1"       name="F1-Score"  fill={CHART_COLOR_LIST[1]} radius={[4,4,0,0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pipeline health */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                Pipeline Health
              </CardTitle>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-600 font-medium">All systems operational</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {PIPELINE_STAGES.map(stage => (
                <div key={stage.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{stage.label}</span>
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      <span className="font-medium">Complete</span>
                    </div>
                  </div>
                  <Progress value={stage.pct} className="h-1.5" />
                </div>
              ))}
              <div className="mt-3 pt-2 border-t border-border/50 grid grid-cols-3 gap-2 text-center text-xs">
                <div><div className="font-semibold text-green-500">6/6</div><div className="text-muted-foreground">Stages Done</div></div>
                <div><div className="font-semibold text-primary">100%</div><div className="text-muted-foreground">Pipeline Health</div></div>
                <div><div className="font-semibold">GNN-AE v2.4.1</div><div className="text-muted-foreground">Active Model</div></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dataset quality overview */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Dataset Quality Overview</CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link href="/datasets">Manage Datasets</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "TCGA-BRCA-2024", samples: 150, quality: 94, status: "active" },
                { name: "TCGA-GBM-2022",  samples: 169, quality: 91, status: "active" },
                { name: "TCGA-LUAD-2023", samples: 230, quality: 88, status: "active" },
                { name: "GEO-GSE29210",   samples: 89,  quality: 76, status: "active" },
              ].map(ds => (
                <div key={ds.name} className="p-3 rounded-lg border border-border/60 space-y-2">
                  <div className="text-xs font-mono font-semibold text-primary truncate">{ds.name}</div>
                  <div className="text-xs text-muted-foreground">{ds.samples} samples</div>
                  <div>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">Quality</span>
                      <span className={`font-semibold ${ds.quality >= 90 ? "text-green-500" : ds.quality >= 80 ? "text-amber-500" : "text-red-500"}`}>
                        {ds.quality}/100
                      </span>
                    </div>
                    <Progress value={ds.quality} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
