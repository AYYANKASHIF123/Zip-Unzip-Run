import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetHeatmapData, useGetPcaData, useGetVolcanoData, useGetUmapData } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { interpolateRdBu } from "d3-scale-chromatic";
import type { HeatmapData } from "@workspace/api-client-react";
import { CHART_COLORS, CHART_COLOR_LIST, formatPercent } from "@/lib/constants";

const SUBTYPE_COLORS: Record<string, string> = {
  "BRCA (Breast)":      CHART_COLORS.pink,
  "LUAD (Lung Adeno)":  CHART_COLORS.blue,
  "COAD (Colon)":       CHART_COLORS.green,
  "GBM (Glioblastoma)": CHART_COLORS.purple,
  "PRAD (Prostate)":    "#f59e0b",
};

// ── Heatmap ──────────────────────────────────────────────────────────────────

function HeatmapCell({ value, min, max }: { value: number; min: number; max: number }) {
  const normalized = (value - min) / (max - min);
  const color = interpolateRdBu(1 - normalized);
  return <rect width={1} height={1} fill={color} />;
}

function GeneHeatmap({ data }: { data: HeatmapData }) {
  const { genes, samples, values } = data;
  const CELL_W = 44, CELL_H = 22, LEFT_MARGIN = 68, TOP_MARGIN = 80, BOTTOM_LEGEND = 28;
  const allValues = values.flat();
  const min = Math.min(...allValues), max = Math.max(...allValues);
  const svgW = LEFT_MARGIN + samples.length * CELL_W + 10;
  const svgH = TOP_MARGIN + genes.length * CELL_H + BOTTOM_LEGEND;

  return (
    <div className="overflow-x-auto">
      <svg width={svgW} height={svgH} style={{ display: "block" }}>
        {/* Sample labels */}
        {samples.map((s: string, si: number) => (
          <text key={s} x={LEFT_MARGIN + si * CELL_W + CELL_W / 2} y={TOP_MARGIN - 6}
            textAnchor="end" fontSize={9} fill="currentColor" opacity={0.7}
            transform={`rotate(-45, ${LEFT_MARGIN + si * CELL_W + CELL_W / 2}, ${TOP_MARGIN - 6})`}>
            {s.replace("TCGA-", "")}
          </text>
        ))}
        {/* Gene labels + cells */}
        {genes.map((gene: string, gi: number) => (
          <g key={gene}>
            <text x={LEFT_MARGIN - 4} y={TOP_MARGIN + gi * CELL_H + CELL_H / 2 + 4}
              textAnchor="end" fontSize={11} fill="currentColor" opacity={0.85} fontWeight={500}>
              {gene}
            </text>
            {values[gi].map((val: number, si: number) => {
              const norm = (val - min) / (max - min);
              const color = interpolateRdBu(1 - norm);
              return (
                <g key={si} transform={`translate(${LEFT_MARGIN + si * CELL_W}, ${TOP_MARGIN + gi * CELL_H})`}>
                  <rect width={CELL_W - 1} height={CELL_H - 1} fill={color} rx={1} />
                  {Math.abs(val) > (max - min) * 0.55 && (
                    <text x={(CELL_W - 1) / 2} y={(CELL_H - 1) / 2 + 4} textAnchor="middle" fontSize={8} fill={norm > 0.8 || norm < 0.2 ? "white" : "black"} opacity={0.9}>
                      {val.toFixed(1)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
        {/* Color legend */}
        {Array.from({ length: 120 }, (_, i) => (
          <rect key={i} x={LEFT_MARGIN + i * 2} y={svgH - BOTTOM_LEGEND + 4}
            width={2} height={12} fill={interpolateRdBu(1 - i / 120)} />
        ))}
        <text x={LEFT_MARGIN - 2} y={svgH - 8} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.6}>{min.toFixed(1)}</text>
        <text x={LEFT_MARGIN + 120} y={svgH - 8} textAnchor="start" fontSize={9} fill="currentColor" opacity={0.6}>{max.toFixed(1)}</text>
        <text x={LEFT_MARGIN + 60} y={svgH - 14} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}>Expression (log2 FC)</text>
      </svg>
    </div>
  );
}

// ── Custom scatter dot ──────────────────────────────────────────────────────

function PcaTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm shadow-lg">
      <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{d?.sampleId}</div>
      <div className="text-gray-500 dark:text-gray-400">{d?.subtype}</div>
      <div className="mt-1 text-gray-600 dark:text-gray-300">PC1: {d?.pc1?.toFixed(2)}, PC2: {d?.pc2?.toFixed(2)}</div>
    </div>
  );
}

function VolcanoTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm shadow-lg">
      <div className="font-bold text-gray-800 dark:text-gray-100">{d?.geneName}</div>
      <div className="text-gray-500 dark:text-gray-400 mt-1">log₂FC: {d?.log2FoldChange?.toFixed(3)}</div>
      <div className="text-gray-500 dark:text-gray-400">−log₁₀(p): {d?.negLog10Pval?.toFixed(3)}</div>
      {d?.significant && <Badge className="mt-1 text-xs" variant={d.upregulated ? "default" : "destructive"}>{d.upregulated ? "↑ Up" : "↓ Down"}</Badge>}
    </div>
  );
}

export default function Genomics() {
  const queryClient = useQueryClient();
  const { data: heatmap, isLoading: hLoading } = useGetHeatmapData();
  const { data: pcaData, isLoading: pLoading } = useGetPcaData();
  const { data: volData, isLoading: vLoading } = useGetVolcanoData();
  const { data: umapData, isLoading: uLoading } = useGetUmapData();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/genomics/heatmap"] });
    queryClient.invalidateQueries({ queryKey: ["/api/genomics/pca"] });
    queryClient.invalidateQueries({ queryKey: ["/api/genomics/volcano"] });
    queryClient.invalidateQueries({ queryKey: ["/api/genomics/umap"] });
  };

  // group PCA points by subtype
  const pcaBySubtype = useMemo(() => {
    if (!pcaData) return {};
    const groups: Record<string, typeof pcaData.points> = {};
    pcaData.points.forEach(p => {
      if (!groups[p.subtype]) groups[p.subtype] = [];
      groups[p.subtype].push(p);
    });
    return groups;
  }, [pcaData]);

  const umapBySubtype = useMemo(() => {
    if (!umapData) return {};
    const groups: Record<string, typeof umapData.points> = {};
    umapData.points.forEach(p => {
      if (!groups[p.subtype]) groups[p.subtype] = [];
      groups[p.subtype].push(p);
    });
    return groups;
  }, [umapData]);

  const volUp = useMemo(() => volData?.points.filter(p => p.significant && p.upregulated) ?? [], [volData]);
  const volDown = useMemo(() => volData?.points.filter(p => p.significant && !p.upregulated) ?? [], [volData]);
  const volNS = useMemo(() => volData?.points.filter(p => !p.significant) ?? [], [volData]);

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Genomics Explorer"
          subtitle="Interactive gene expression visualizations — heatmap, PCA, volcano plot, and UMAP clustering."
          loading={hLoading || pLoading || vLoading || uLoading}
          onRefresh={handleRefresh}
        />

        <Tabs defaultValue="heatmap">
          <TabsList className="mb-4">
            <TabsTrigger value="heatmap">Expression Heatmap</TabsTrigger>
            <TabsTrigger value="pca">PCA</TabsTrigger>
            <TabsTrigger value="volcano">Volcano Plot</TabsTrigger>
            <TabsTrigger value="umap">UMAP</TabsTrigger>
          </TabsList>

          {/* HEATMAP */}
          <TabsContent value="heatmap">
            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-base">Gene Expression Heatmap — Top 20 Biomarker Genes × {heatmap?.samples.length ?? "—"} Samples</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Rows = genes, columns = TCGA samples. Color encodes log₂ fold-change (red = up, blue = down).</p>
              </CardHeader>
              <CardContent>
                {hLoading ? <Skeleton className="w-full h-[480px]" /> : heatmap ? <GeneHeatmap data={heatmap} /> : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PCA */}
          <TabsContent value="pca">
            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-base">Principal Component Analysis (PCA)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Dimensionality reduction of 20,531-gene expression profiles.
                  {pcaData && ` PC1 explains ${formatPercent(pcaData.varianceExplained[0] * 100)} variance, PC2 explains ${formatPercent(pcaData.varianceExplained[1] * 100)}.`}
                </p>
              </CardHeader>
              <CardContent>
                {pLoading ? <Skeleton className="w-full h-[420px]" /> : (
                  <ResponsiveContainer width="100%" height={420}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis type="number" dataKey="pc1" name="PC1" label={{ value: "PC1", position: "insideBottom", offset: -5, fontSize: 12 }} fontSize={11} opacity={0.7} />
                      <YAxis type="number" dataKey="pc2" name="PC2" label={{ value: "PC2", angle: -90, position: "insideLeft", fontSize: 12 }} fontSize={11} opacity={0.7} />
                      <Tooltip content={<PcaTooltip />} cursor={false} />
                      {Object.entries(pcaBySubtype).map(([subtype, pts], i) => (
                        <Scatter key={subtype} name={subtype} data={pts} fill={SUBTYPE_COLORS[subtype] ?? CHART_COLOR_LIST[i % CHART_COLOR_LIST.length]}>
                          {pts.map((_, j) => <Cell key={j} fill={SUBTYPE_COLORS[subtype] ?? CHART_COLOR_LIST[i % CHART_COLOR_LIST.length]} fillOpacity={0.8} />)}
                        </Scatter>
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
                {/* Legend */}
                {!pLoading && pcaData && (
                  <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 justify-center">
                    {Object.keys(pcaBySubtype).map(st => (
                      <div key={st} className="flex items-center gap-1.5 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: SUBTYPE_COLORS[st] ?? "#888" }} />
                        <span className="text-muted-foreground">{st}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* VOLCANO */}
          <TabsContent value="volcano">
            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-base">Volcano Plot — Differential Gene Expression</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">X-axis: log₂ fold-change vs. control. Y-axis: −log₁₀(p-value). Dashed lines mark significance thresholds (|FC|≥1.5, p≤0.01).</p>
              </CardHeader>
              <CardContent>
                {vLoading ? <Skeleton className="w-full h-[420px]" /> : (
                  <ResponsiveContainer width="100%" height={420}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis type="number" dataKey="log2FoldChange" name="log2FC" label={{ value: "log₂ Fold Change", position: "insideBottom", offset: -10, fontSize: 12 }} fontSize={11} opacity={0.7} domain={[-6, 6]} />
                      <YAxis type="number" dataKey="negLog10Pval" name="-log10(p)" label={{ value: "-log₁₀(p)", angle: -90, position: "insideLeft", fontSize: 12 }} fontSize={11} opacity={0.7} />
                      <ReferenceLine x={volData?.thresholdFc ?? 1.5} stroke="#6b7280" strokeDasharray="4 3" opacity={0.5} />
                      <ReferenceLine x={-(volData?.thresholdFc ?? 1.5)} stroke="#6b7280" strokeDasharray="4 3" opacity={0.5} />
                      <ReferenceLine y={volData?.thresholdPval ?? 2} stroke="#6b7280" strokeDasharray="4 3" opacity={0.5} />
                      <Tooltip content={<VolcanoTooltip />} cursor={false} />
                      <Scatter name="NS" data={volNS} fill="#94a3b8" fillOpacity={0.4} />
                      <Scatter name="Upregulated" data={volUp} fill={CHART_COLORS.red}>
                        {volUp.map((_, i) => <Cell key={i} fill={CHART_COLORS.red} fillOpacity={0.85} />)}
                      </Scatter>
                      <Scatter name="Downregulated" data={volDown} fill={CHART_COLORS.blue}>
                        {volDown.map((_, i) => <Cell key={i} fill={CHART_COLORS.blue} fillOpacity={0.85} />)}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
                {!vLoading && volData && (
                  <div className="flex gap-6 justify-center mt-2">
                    <div className="flex items-center gap-1.5 text-sm"><span className="w-2.5 h-2.5 rounded-full inline-block bg-red-600" /><span className="text-muted-foreground">Upregulated ({volUp.length})</span></div>
                    <div className="flex items-center gap-1.5 text-sm"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: CHART_COLORS.blue }} /><span className="text-muted-foreground">Downregulated ({volDown.length})</span></div>
                    <div className="flex items-center gap-1.5 text-sm"><span className="w-2.5 h-2.5 rounded-full inline-block bg-slate-400" /><span className="text-muted-foreground">Not significant ({volNS.length})</span></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* UMAP */}
          <TabsContent value="umap">
            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-base">UMAP Embedding</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Uniform Manifold Approximation and Projection of high-dimensional gene expression data. Each point is a patient sample, colored by cancer subtype.</p>
              </CardHeader>
              <CardContent>
                {uLoading ? <Skeleton className="w-full h-[420px]" /> : (
                  <ResponsiveContainer width="100%" height={420}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis type="number" dataKey="x" name="UMAP 1" label={{ value: "UMAP 1", position: "insideBottom", offset: -5, fontSize: 12 }} fontSize={11} opacity={0.7} />
                      <YAxis type="number" dataKey="y" name="UMAP 2" label={{ value: "UMAP 2", angle: -90, position: "insideLeft", fontSize: 12 }} fontSize={11} opacity={0.7} />
                      <Tooltip content={<PcaTooltip />} cursor={false} />
                      {Object.entries(umapBySubtype).map(([subtype, pts], i) => (
                        <Scatter key={subtype} name={subtype} data={pts} fill={SUBTYPE_COLORS[subtype] ?? CHART_COLOR_LIST[i % 5]}>
                          {pts.map((_, j) => <Cell key={j} fill={SUBTYPE_COLORS[subtype] ?? CHART_COLOR_LIST[i % 5]} fillOpacity={0.85} />)}
                        </Scatter>
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
                {!uLoading && umapData && (
                  <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 justify-center">
                    {Object.keys(umapBySubtype).map(st => (
                      <div key={st} className="flex items-center gap-1.5 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: SUBTYPE_COLORS[st] ?? "#888" }} />
                        <span className="text-muted-foreground">{st}</span>
                      </div>
                    ))}
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
