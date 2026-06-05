import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListAnalyses } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CSVLink } from "react-csv";
import { Download, Info, Sparkles, TrendingUp, TrendingDown, Brain } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { formatPercent } from "@/lib/constants";

// ── Subtype colours ──────────────────────────────────────────────────────────
const SUBTYPE_COLORS: Record<string, string> = {
  "BRCA (Breast)":      "#ec4899",
  "LUAD (Lung Adeno)":  "#0079F2",
  "COAD (Colon)":       "#009118",
  "GBM (Glioblastoma)": "#795EFF",
  "PRAD (Prostate)":    "#f59e0b",
};

type ImportanceGene = {
  gene: string;
  importance: number;
  rank: number;
  perClassMean: Record<string, number>;
};

type Contribution = {
  gene: string;
  importance: number;
  scaledValue: number;
  classMean: number;
  contribution: number;
  direction: "pos" | "neg";
};

type Explanation = {
  sampleId: string;
  predictedSubtype: string;
  confidenceScore: number;
  contributions: Contribution[];
  analysisId?: number;
  dataSource?: string;
};

// Which subtype "owns" each gene (highest absolute class mean)
function dominantSubtype(gene: ImportanceGene): string {
  return Object.entries(gene.perClassMean).reduce(
    (best, [sub, mean]) =>
      Math.abs(mean) > Math.abs(gene.perClassMean[best] ?? 0) ? sub : best,
    Object.keys(gene.perClassMean)[0] ?? ""
  );
}

export default function ExplainableAI() {
  const [selectedId, setSelectedId] = useState<string>("");

  // ── Global importance from RF ────────────────────────────────────────────
  const importanceQuery = useQuery<{ genes: ImportanceGene[]; method: string; nTrees: number }>({
    queryKey: ["/api/xai/importance"],
    queryFn: () => fetch("/api/xai/importance").then(r => r.json()),
    staleTime: 5 * 60_000,
  });

  // ── All completed analyses for the dropdown ───────────────────────────────
  const { data: allAnalyses } = useListAnalyses();
  const completedAnalyses = useMemo(
    () => (allAnalyses ?? []).filter(a => (a as Record<string, unknown>).status === "completed"),
    [allAnalyses]
  );

  // Set default selection once analyses load
  useMemo(() => {
    if (!selectedId && completedAnalyses.length > 0) {
      setSelectedId(String((completedAnalyses[0] as Record<string, unknown>).id));
    }
  }, [completedAnalyses, selectedId]);

  // ── Per-sample explanation ───────────────────────────────────────────────
  const explainQuery = useQuery<Explanation>({
    queryKey: ["/api/xai/explain", selectedId],
    queryFn: () => fetch(`/api/xai/explain/${selectedId}`).then(r => {
      if (!r.ok) throw new Error("Explanation unavailable");
      return r.json();
    }),
    enabled: !!selectedId,
    staleTime: 60_000,
  });

  const genes = importanceQuery.data?.genes ?? [];
  const explanation = explainQuery.data;
  const selectedAnalysis = completedAnalyses.find(
    a => String((a as Record<string, unknown>).id) === selectedId
  ) as Record<string, unknown> | undefined;

  // Top-15 for global chart
  const globalChartData = genes.slice(0, 15).map(g => {
    const dom = dominantSubtype(g);
    const mean = g.perClassMean[dom] ?? 0;
    return {
      gene: g.gene,
      importance: g.importance,
      fill: mean >= 0 ? "#0079F2" : "#ef4444",
      dominantSubtype: dom,
      dominantMean: mean,
    };
  });

  // Top-15 contributions for sample chart
  const sampleChartData = (explanation?.contributions ?? []).slice(0, 15).map(c => ({
    gene: c.gene,
    value: c.contribution,
    fill: c.contribution >= 0 ? "#009118" : "#ef4444",
    scaledValue: c.scaledValue,
    classMean: c.classMean,
  }));

  const subtypeColor = explanation
    ? SUBTYPE_COLORS[explanation.predictedSubtype] ?? "#0079F2"
    : "#0079F2";

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Explainable AI"
          subtitle="Real Random Forest feature importances and per-sample prediction explanations."
        />

        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Method:</strong> Global importance uses MDI (Mean Decrease in Impurity) from the 200-tree Random Forest.
            Per-sample contributions are computed as <code className="font-mono text-xs">importance × (scaled_value − class_mean)</code>,
            where positive values indicate the gene pushes toward the predicted subtype.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="global">
          <TabsList>
            <TabsTrigger value="global">Global Feature Importance</TabsTrigger>
            <TabsTrigger value="sample">Sample-Level Explanation</TabsTrigger>
            <TabsTrigger value="table">Gene Importance Table</TabsTrigger>
          </TabsList>

          {/* ── GLOBAL TAB ── */}
          <TabsContent value="global" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Top 15 Genes — RF Feature Importance (MDI)</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Blue = gene is primarily upregulated in its dominant subtype · Red = primarily downregulated
                  </p>
                </div>
                {genes.length > 0 && (
                  <CSVLink
                    data={genes}
                    filename="global-feature-importance.csv"
                    className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </CSVLink>
                )}
              </CardHeader>
              <CardContent>
                {importanceQuery.isLoading ? (
                  <Skeleton className="w-full h-[380px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={420} debounce={0}>
                    <BarChart data={globalChartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                      <XAxis
                        type="number"
                        fontSize={11}
                        opacity={0.7}
                        tickFormatter={v => v.toFixed(3)}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="gene"
                        fontSize={12}
                        width={70}
                        opacity={0.85}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(0,0,0,0.04)" }}
                        isAnimationActive={false}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as typeof globalChartData[number];
                          return (
                            <div className="bg-popover border border-border px-3 py-2 rounded-md shadow-md text-sm">
                              <p className="font-semibold font-mono">{d.gene}</p>
                              <p className="text-muted-foreground">MDI importance: <span className="font-bold text-foreground">{d.importance.toFixed(5)}</span></p>
                              <p className="text-muted-foreground">
                                Dominant in: <span className="font-medium" style={{ color: SUBTYPE_COLORS[d.dominantSubtype] }}>{d.dominantSubtype}</span>
                              </p>
                              <p className="text-muted-foreground">Class mean (scaled): <span className="font-bold text-foreground">{d.dominantMean.toFixed(3)}</span></p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="importance" name="MDI Importance" radius={[0, 4, 4, 0]} isAnimationActive={false} maxBarSize={24}>
                        {globalChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* 3 summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="border-blue-200 dark:border-blue-800">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold">Top Upregulated Drivers</span>
                  </div>
                  {importanceQuery.isLoading
                    ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full mb-1" />)
                    : genes
                        .filter(g => (g.perClassMean[dominantSubtype(g)] ?? 0) >= 0)
                        .slice(0, 5)
                        .map(g => {
                          const dom = dominantSubtype(g);
                          return (
                            <div key={g.gene} className="flex items-center justify-between py-1 text-sm border-b border-border/30 last:border-0">
                              <span className="font-mono font-medium">{g.gene}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] px-1.5" style={{ borderColor: SUBTYPE_COLORS[dom] + "80", color: SUBTYPE_COLORS[dom] }}>
                                  {dom.split(" ")[0]}
                                </Badge>
                                <span className="text-blue-600 font-mono">{g.importance.toFixed(4)}</span>
                              </div>
                            </div>
                          );
                        })
                  }
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-900">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-semibold">Top Suppressor Genes</span>
                  </div>
                  {importanceQuery.isLoading
                    ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full mb-1" />)
                    : genes
                        .filter(g => (g.perClassMean[dominantSubtype(g)] ?? 0) < 0)
                        .slice(0, 5)
                        .map(g => {
                          const dom = dominantSubtype(g);
                          return (
                            <div key={g.gene} className="flex items-center justify-between py-1 text-sm border-b border-border/30 last:border-0">
                              <span className="font-mono font-medium">{g.gene}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] px-1.5" style={{ borderColor: SUBTYPE_COLORS[dom] + "80", color: SUBTYPE_COLORS[dom] }}>
                                  {dom.split(" ")[0]}
                                </Badge>
                                <span className="text-red-600 font-mono">{g.importance.toFixed(4)}</span>
                              </div>
                            </div>
                          );
                        })
                  }
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-semibold">Model Summary</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Model",        value: "Random Forest v1.0" },
                      { label: "XAI Method",   value: "MDI + Class-Mean Δ" },
                      { label: "Trees",         value: importanceQuery.data ? `${importanceQuery.data.nTrees}` : "200" },
                      { label: "Features",      value: `${genes.length} genes` },
                      { label: "Top Gene",      value: genes[0]?.gene ?? "—" },
                      { label: "Top Importance",value: genes[0] ? genes[0].importance.toFixed(5) : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium text-primary text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── SAMPLE TAB ── */}
          <TabsContent value="sample" className="space-y-4 mt-4">
            {/* Dropdown */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">Select analysis:</span>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Choose a completed analysis…" />
                </SelectTrigger>
                <SelectContent>
                  {completedAnalyses.map(a => {
                    const ar = a as Record<string, unknown>;
                    return (
                      <SelectItem key={String(ar.id)} value={String(ar.id)}>
                        {ar.sampleId as string} — {ar.cancerSubtype as string}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {explanation && (
                <>
                  <Badge style={{ backgroundColor: subtypeColor + "20", color: subtypeColor, border: `1px solid ${subtypeColor}50` }}>
                    {explanation.predictedSubtype}
                  </Badge>
                  <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-400">
                    {formatPercent(explanation.confidenceScore * 100)} confidence
                  </Badge>
                </>
              )}
            </div>

            {/* Waterfall / contribution chart */}
            <Card>
              <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">
                    Gene Contribution — {explanation?.sampleId ?? "…"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Green = pushes toward <strong>{explanation?.predictedSubtype ?? "predicted subtype"}</strong> · Red = pushes against
                  </p>
                </div>
                {explanation && (
                  <CSVLink
                    data={explanation.contributions}
                    filename={`explain-${explanation.sampleId}.csv`}
                    className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </CSVLink>
                )}
              </CardHeader>
              <CardContent>
                {explainQuery.isLoading ? (
                  <Skeleton className="w-full h-[360px]" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={380} debounce={0}>
                      <BarChart data={sampleChartData} layout="vertical" margin={{ left: 10, right: 40, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                        <XAxis
                          type="number"
                          fontSize={11}
                          opacity={0.7}
                          tickFormatter={v => v.toFixed(3)}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="gene"
                          fontSize={12}
                          width={70}
                          opacity={0.85}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(0,0,0,0.04)" }}
                          isAnimationActive={false}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload as typeof sampleChartData[number];
                            return (
                              <div className="bg-popover border border-border px-3 py-2 rounded-md shadow-md text-sm space-y-0.5">
                                <p className="font-semibold font-mono">{d.gene}</p>
                                <p className="text-muted-foreground">Contribution: <span className="font-bold" style={{ color: d.fill }}>{d.value >= 0 ? "+" : ""}{d.value.toFixed(5)}</span></p>
                                <p className="text-muted-foreground">Scaled value: <span className="font-bold text-foreground">{d.scaledValue.toFixed(3)}</span></p>
                                <p className="text-muted-foreground">Class mean: <span className="font-bold text-foreground">{d.classMean.toFixed(3)}</span></p>
                              </div>
                            );
                          }}
                        />
                        <ReferenceLine x={0} stroke="currentColor" opacity={0.3} />
                        <Bar dataKey="value" name="Contribution" radius={[0, 4, 4, 0]} isAnimationActive={false} maxBarSize={24}>
                          {sampleChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      Showing top 15 genes by |contribution|. Formula: importance × (scaled_value − class_mean).
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Narrative explanation */}
            {explanation && !explainQuery.isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-semibold">Genes Supporting Prediction</span>
                    </div>
                    {explanation.contributions.filter(c => c.direction === "pos").slice(0, 5).map(c => (
                      <div key={c.gene} className="flex items-center justify-between py-1 text-sm border-b border-border/30 last:border-0">
                        <span className="font-mono font-medium">{c.gene}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">val {c.scaledValue > 0 ? "+" : ""}{c.scaledValue.toFixed(2)}</span>
                          <span className="font-mono text-green-600 font-bold">+{c.contribution.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-semibold">Genes Opposing Prediction</span>
                    </div>
                    {explanation.contributions.filter(c => c.direction === "neg").slice(0, 5).map(c => (
                      <div key={c.gene} className="flex items-center justify-between py-1 text-sm border-b border-border/30 last:border-0">
                        <span className="font-mono font-medium">{c.gene}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">val {c.scaledValue > 0 ? "+" : ""}{c.scaledValue.toFixed(2)}</span>
                          <span className="font-mono text-red-600 font-bold">{c.contribution.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Narrative */}
            {explanation && !explainQuery.isLoading && (
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">Prediction Reasoning</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    For sample <strong className="font-mono">{explanation.sampleId}</strong> (
                    {explanation.dataSource}), the Random Forest predicts{" "}
                    <strong style={{ color: subtypeColor }}>{explanation.predictedSubtype}</strong> with{" "}
                    <strong>{formatPercent(explanation.confidenceScore * 100)}</strong> confidence.{" "}
                    The strongest supporting genes are{" "}
                    <strong className="font-mono">
                      {explanation.contributions.filter(c => c.direction === "pos").slice(0, 3).map(c => c.gene).join(", ")}
                    </strong>
                    , whose expression levels exceed the typical {explanation.predictedSubtype} class mean.{" "}
                    The genes opposing this classification include{" "}
                    <strong className="font-mono">
                      {explanation.contributions.filter(c => c.direction === "neg").slice(0, 3).map(c => c.gene).join(", ")}
                    </strong>
                    , which are below the expected class pattern.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── TABLE TAB ── */}
          <TabsContent value="table" className="mt-4">
            <Card>
              <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">All 50 Genes — Full Importance Ranking</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Sorted by MDI importance. Per-class means are in standard-scaled space.</p>
                </div>
                {genes.length > 0 && (
                  <CSVLink
                    data={genes}
                    filename="gene-importance-full.csv"
                    className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </CSVLink>
                )}
              </CardHeader>
              <CardContent>
                {importanceQuery.isLoading ? (
                  <div className="space-y-2 mt-2">
                    <Skeleton className="h-10 w-full" />
                    {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : (
                  <div className="rounded-md border mt-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">Rank</TableHead>
                          <TableHead>Gene</TableHead>
                          <TableHead className="text-right">MDI Score</TableHead>
                          {Object.keys(genes[0]?.perClassMean ?? {}).map(sub => (
                            <TableHead key={sub} className="text-right text-xs">
                              <span style={{ color: SUBTYPE_COLORS[sub] }}>
                                {sub.split(" ")[0]}
                              </span>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {genes.map(g => {
                          const dom = dominantSubtype(g);
                          return (
                            <TableRow key={g.gene}>
                              <TableCell className="font-mono text-sm text-muted-foreground">{g.rank}</TableCell>
                              <TableCell>
                                <span className="font-mono font-semibold text-primary">{g.gene}</span>
                                <Badge variant="outline" className="ml-2 text-[10px] px-1" style={{ borderColor: SUBTYPE_COLORS[dom] + "60", color: SUBTYPE_COLORS[dom] }}>
                                  {dom.split(" ")[0]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">{g.importance.toFixed(5)}</TableCell>
                              {Object.entries(g.perClassMean).map(([sub, mean]) => (
                                <TableCell key={sub} className="text-right font-mono text-xs">
                                  <span style={{ color: mean >= 0 ? "#009118" : "#ef4444" }}>
                                    {mean >= 0 ? "+" : ""}{mean.toFixed(2)}
                                  </span>
                                </TableCell>
                              ))}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
