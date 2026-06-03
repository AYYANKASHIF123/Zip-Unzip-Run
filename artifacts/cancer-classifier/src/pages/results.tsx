import { useMemo } from "react";
import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetAnalysisResults, useGetAnalysis } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent, CHART_COLOR_LIST } from "@/lib/constants";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadialBarChart, RadialBar } from "recharts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CSVLink } from "react-csv";
import { Download, ChevronLeft, Brain, Clock, Dna, FlaskConical, FileText, Pill } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

// ── Same seeded RNG as the API server — reproduces gene values from sampleId ──
const ML_GENES = [
  "ERBB2","PIK3CA","PTEN","BRAF","KRAS","CTNNB1","BRCA1","BRCA2","EGFR","NRAS",
  "TP53","CCND1","MYC","SRC","PBRM1","AR","ESR1","CDH1","RB1","CDKN2A",
  "VHL","APC","MLH1","SMAD4","FGFR1","FGFR2","FGFR3","ALK","MET","RET",
  "NF1","NF2","NOTCH1","NOTCH2","PDGFRA","KIT","IDH1","IDH2","TERT","CDKN1B",
  "PIK3R1","FOXO3","AKT1","MTOR","ARID1A","SETD2","KDM6A","CREBBP","EP300","DNMT3A",
];

function seededRandom(seed: string): () => number {
  let s = [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0x7fffffff, 1);
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function getGeneExpressionValues(sampleId: string) {
  const rand = seededRandom(sampleId);
  return ML_GENES.map((gene) => ({ gene, value: +(rand() * 6 - 2).toFixed(4) }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)); // sort by abs expression
}

// ── Subtype colour palette ────────────────────────────────────────────────────
const SUBTYPE_COLORS: Record<string, string> = {
  "BRCA (Breast)":      "#ec4899",
  "LUAD (Lung Adeno)":  "#0079F2",
  "COAD (Colon)":       "#009118",
  "GBM (Glioblastoma)": "#795EFF",
  "PRAD (Prostate)":    "#f59e0b",
};

export default function Results() {
  const { id } = useParams();
  const analysisId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysisQuery = useGetAnalysis(analysisId, { query: { enabled: !!analysisId } as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultsQuery = useGetAnalysisResults(analysisId, { query: { enabled: !!analysisId } as any });

  const loading = analysisQuery.isLoading || resultsQuery.isLoading || analysisQuery.isFetching || resultsQuery.isFetching;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/analyses", analysisId] });
    queryClient.invalidateQueries({ queryKey: ["/api/analyses", analysisId, "results"] });
  };

  const results = resultsQuery.data;
  const analysis = analysisQuery.data as Record<string, unknown> | undefined;

  const geneValues = useMemo(
    () => (analysis?.sampleId ? getGeneExpressionValues(analysis.sampleId as string) : []),
    [analysis?.sampleId]
  );

  const subtypeColor = results?.predictedSubtype
    ? SUBTYPE_COLORS[results.predictedSubtype] ?? "#0079F2"
    : "#0079F2";

  const confidencePct = results ? results.confidenceScore * 100 : 0;

  return (
    <div className="min-h-screen bg-background px-5 py-4 pt-[32px] pb-[32px] pl-[24px] pr-[24px]">
      <div className="max-w-[1400px] mx-auto space-y-4">

        {/* ── Back link ── */}
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild className="h-8 px-2">
            <Link href="/analyses">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Analyses
            </Link>
          </Button>
        </div>

        <HeaderControls
          title={`Analysis Report: ${analysis?.sampleId || "Loading…"}`}
          subtitle="Full classification output from the Random Forest model — probabilities, biomarkers, and treatment guidance."
          loading={loading}
          onRefresh={handleRefresh}
        />

        {/* ── Stat hero row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              icon: <Brain className="h-4 w-4" />,
              label: "Predicted Subtype",
              value: loading ? "…" : (results?.predictedSubtype ?? "—"),
              color: subtypeColor,
            },
            {
              icon: <FlaskConical className="h-4 w-4" />,
              label: "Confidence Score",
              value: loading ? "…" : formatPercent(confidencePct),
              color: confidencePct >= 80 ? "#009118" : confidencePct >= 60 ? "#f59e0b" : "#A60808",
            },
            {
              icon: <Dna className="h-4 w-4" />,
              label: "Genes Analysed",
              value: loading ? "…" : `${analysis?.geneCount ?? 50} genes`,
              color: "#0079F2",
            },
            {
              icon: <Clock className="h-4 w-4" />,
              label: "Processing Time",
              value: loading ? "…" : (analysis?.processingTimeMs ? `${analysis.processingTimeMs as number} ms` : "—"),
              color: "#795EFF",
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                  {stat.label}
                </div>
                <p className="text-xl font-bold truncate" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Probability chart + Classification panel ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Classification panel */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-base">Classification</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-5">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : results ? (
                <>
                  {/* Subtype pill */}
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: subtypeColor }}
                    />
                    <p className="text-2xl font-bold leading-tight" style={{ color: subtypeColor }}>
                      {results.predictedSubtype}
                    </p>
                  </div>

                  {/* Confidence bar */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-sm font-medium text-muted-foreground">Model Confidence</p>
                      <p className="text-sm font-bold" style={{ color: subtypeColor }}>
                        {formatPercent(confidencePct)}
                      </p>
                    </div>
                    <Progress value={confidencePct} className="h-2.5" style={{ ["--progress-foreground" as never]: subtypeColor }} />
                  </div>

                  {/* Molecular signature */}
                  {results.molecularSignature?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Molecular Signature</p>
                      <div className="flex flex-wrap gap-1.5">
                        {results.molecularSignature.map((sig: string) => (
                          <Badge
                            key={sig}
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: subtypeColor + "60", color: subtypeColor }}
                          >
                            {sig}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample metadata */}
                  <div className="border rounded-md divide-y text-sm">
                    {[
                      { label: "Sample ID", value: analysis?.sampleId as string },
                      { label: "Data Source", value: analysis?.dataSource as string },
                      { label: "Submitted", value: analysis?.createdAt ? format(new Date(analysis.createdAt as string), "MMM d, yyyy HH:mm") : "—" },
                      { label: "Completed", value: analysis?.completedAt ? format(new Date(analysis.completedAt as string), "MMM d, yyyy HH:mm") : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between px-3 py-2">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-right ml-2 truncate max-w-[140px]">{value ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Probability chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Subtype Probabilities</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Posterior probability from Random Forest (200 trees)</p>
              </div>
              {!loading && results?.subtypeProbabilities && (
                <CSVLink
                  data={results.subtypeProbabilities}
                  filename={`probabilities-${analysis?.sampleId}.csv`}
                  className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground"
                >
                  <Download className="w-3.5 h-3.5" />
                </CSVLink>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="w-full h-[280px]" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={280} debounce={0}>
                    <BarChart
                      data={results?.subtypeProbabilities}
                      layout="vertical"
                      margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} opacity={0.15} />
                      <XAxis
                        type="number"
                        domain={[0, 1]}
                        tickFormatter={(v) => formatPercent(v * 100)}
                        fontSize={11}
                        opacity={0.6}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        dataKey="subtype"
                        type="category"
                        fontSize={12}
                        width={130}
                        opacity={0.8}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(0,0,0,0.04)" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload as { subtype: string; probability: number };
                          return (
                            <div className="bg-popover border border-border text-popover-foreground px-3 py-2 rounded-md shadow-md text-sm">
                              <p className="font-semibold mb-0.5" style={{ color: SUBTYPE_COLORS[p.subtype] ?? "#666" }}>
                                {p.subtype}
                              </p>
                              <p className="text-muted-foreground">
                                Probability: <span className="font-bold text-foreground">{formatPercent(p.probability * 100)}</span>
                              </p>
                            </div>
                          );
                        }}
                        isAnimationActive={false}
                      />
                      <Bar dataKey="probability" radius={[0, 5, 5, 0]} isAnimationActive={false} maxBarSize={32}>
                        {results?.subtypeProbabilities.map((entry: { subtype: string; probability: number }, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={SUBTYPE_COLORS[entry.subtype] ?? CHART_COLOR_LIST[index % CHART_COLOR_LIST.length]}
                            opacity={entry.subtype === results.predictedSubtype ? 1 : 0.45}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    Highlighted bar = predicted subtype. Probabilities sum to 100%.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Treatment Pathways ── */}
        {!loading && results?.treatmentPathways?.length > 0 && (
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                Recommended Treatment Pathways
              </CardTitle>
              <p className="text-xs text-muted-foreground">Evidence-based options for {results.predictedSubtype}. Decisions should be guided by tumor board review.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {results.treatmentPathways.map((pathway: string, i: number) => (
                  <div
                    key={pathway}
                    className="rounded-lg border p-3 flex flex-col gap-1"
                    style={{ borderLeftWidth: 3, borderLeftColor: subtypeColor }}
                  >
                    <span className="text-xs font-medium text-muted-foreground">Option {i + 1}</span>
                    <span className="text-sm font-semibold leading-snug">{pathway}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Biomarkers ── */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                Top Biomarkers
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Highest-significance genes for {results?.predictedSubtype ?? "this subtype"}</p>
            </div>
            {!loading && results?.topBiomarkers && (
              <CSVLink
                data={results.topBiomarkers}
                filename={`biomarkers-${analysis?.sampleId}.csv`}
                className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground"
              >
                <Download className="w-3.5 h-3.5" />
              </CSVLink>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2 mt-4">
                <Skeleton className="h-10 w-full" />
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="rounded-md border mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gene ID</TableHead>
                      <TableHead>Gene Name</TableHead>
                      <TableHead className="text-right">Expression Level</TableHead>
                      <TableHead className="text-right">Significance (p-value)</TableHead>
                      <TableHead className="text-right">Δ vs Normal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results?.topBiomarkers.map((biomarker: Record<string, unknown>) => {
                      const geneEntry = geneValues.find((g) => g.gene === (biomarker.geneId as string)?.replace(/\.\d+$/, ""));
                      const expr = geneEntry?.value ?? (biomarker.expressionLevel as number);
                      const isUp = expr > 0;
                      return (
                        <TableRow key={biomarker.geneId as string}>
                          <TableCell className="font-mono text-sm">{biomarker.geneId as string}</TableCell>
                          <TableCell className="font-medium text-sm">{biomarker.geneName as string}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {(biomarker.expressionLevel as number).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {(biomarker.significance as number).toExponential(2)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <Badge
                              variant="outline"
                              className={`font-medium border-0 ${isUp ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"}`}
                            >
                              {isUp ? "▲ Up" : "▼ Down"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!results?.topBiomarkers || results.topBiomarkers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No biomarkers identified.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Gene expression input ── */}
        {!loading && geneValues.length > 0 && (
          <Card>
            <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Dna className="h-4 w-4 text-primary" />
                  Gene Expression Input (top 15 by magnitude)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  50-gene vector fed to the Random Forest — sorted by absolute expression level
                </p>
              </div>
              <CSVLink
                data={geneValues}
                filename={`gene-expression-${analysis?.sampleId}.csv`}
                className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground"
              >
                <Download className="w-3.5 h-3.5" />
              </CSVLink>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
                {geneValues.slice(0, 15).map(({ gene, value }) => {
                  const pct = Math.min(Math.abs(value) / 4, 1) * 100;
                  const isUp = value > 0;
                  return (
                    <div key={gene} className="rounded-md border p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold">{gene}</span>
                        <span
                          className={`text-xs font-bold ${isUp ? "text-red-600" : "text-blue-600"}`}
                        >
                          {value > 0 ? "+" : ""}{value}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isUp ? "#ef4444" : "#3b82f6",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Clinical notes ── */}
        {!loading && results?.clinicalNotes && (
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Clinical Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{results.clinicalNotes}</p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
