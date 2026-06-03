import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useListAnalyses, compareSamples } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { CHART_COLOR_LIST, formatPercent } from "@/lib/constants";
import { GitCompare, CheckCircle2, XCircle } from "lucide-react";

export default function SampleComparison() {
  const queryClient = useQueryClient();
  const { data: analyses, isLoading } = useListAnalyses();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { mutate: compare, data: result, isPending } = useMutation({
    mutationFn: (ids: number[]) => compareSamples({ analysisIds: ids }),
  });

  const completed = analyses?.filter(a => a.status === "completed") ?? [];

  const toggleId = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev);
  };

  const handleCompare = () => { if (selectedIds.length >= 2) compare(selectedIds); };

  // Build radar data from compared analyses confidence scores
  const radarData = result ? [
    { metric: "Confidence", ...Object.fromEntries(result.analyses.map(a => [a.sampleId.replace("TCGA-", ""), (a.confidenceScore ?? 0) * 100])) },
    { metric: "Biomarker Overlap", ...Object.fromEntries(result.analyses.map(a => [a.sampleId.replace("TCGA-", ""), result.biomarkerOverlap * 100])) },
    { metric: "Stage Score", ...Object.fromEntries(result.analyses.map(a => [a.sampleId.replace("TCGA-", ""), { "I": 25, "II": 50, "III": 75, "IV": 100 }[a.stage ?? ""] ?? 50])) },
    { metric: "Gene Count", ...Object.fromEntries(result.analyses.map(a => [a.sampleId.replace("TCGA-", ""), ((a.geneCount ?? 20531) / 20531) * 100])) },
  ] : [];

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Sample Comparison"
          subtitle="Compare 2–5 patient samples side-by-side — biomarker overlap, molecular profiles, and clinical features."
          loading={isLoading}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["/api/analyses"] })}
        />

        <Card>
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Select Samples to Compare</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Select 2–5 completed analyses. Click "Compare" to run side-by-side analysis.</p>
            </div>
            <Button onClick={handleCompare} disabled={selectedIds.length < 2 || isPending} className="gap-1.5">
              <GitCompare className="w-4 h-4" />
              {isPending ? "Comparing…" : `Compare (${selectedIds.length})`}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="w-full h-[280px]" /> : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Sample ID</TableHead>
                      <TableHead>Cancer Subtype</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Tissue</TableHead>
                      <TableHead>Gender / Age</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completed.map(a => (
                      <TableRow key={a.id} className={`cursor-pointer ${selectedIds.includes(a.id) ? "bg-primary/5" : ""}`} onClick={() => toggleId(a.id)}>
                        <TableCell><Checkbox checked={selectedIds.includes(a.id)} onCheckedChange={() => toggleId(a.id)} /></TableCell>
                        <TableCell className="font-mono text-sm font-medium">{a.sampleId}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs font-normal">{a.cancerSubtype}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{a.stage ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.tissueType ?? "—"}</TableCell>
                        <TableCell className="text-sm">{a.patientGender ?? "—"} · {a.patientAge ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{a.confidenceScore ? formatPercent(a.confidenceScore * 100) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <>
            {/* Side-by-side KPI comparison */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {result.analyses.map((a, i) => (
                <Card key={a.id} style={{ borderTopColor: CHART_COLOR_LIST[i % CHART_COLOR_LIST.length], borderTopWidth: 3 }}>
                  <CardContent className="pt-3 pb-3">
                    <div className="font-mono text-sm font-bold text-primary">{a.sampleId}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{a.cancerSubtype}</div>
                    <div className="mt-2 text-xl font-bold">{a.confidenceScore ? formatPercent(a.confidenceScore * 100) : "—"}</div>
                    <div className="text-xs text-muted-foreground">confidence</div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1 text-xs">
                      <div><span className="text-muted-foreground">Stage:</span> {a.stage ?? "—"}</div>
                      <div><span className="text-muted-foreground">Age:</span> {a.patientAge ?? "—"}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Radar chart */}
              <Card>
                <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-base">Multi-dimensional Comparison</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={radarData}>
                      <PolarGrid opacity={0.2} />
                      <PolarAngleAxis dataKey="metric" fontSize={12} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      {result.analyses.map((a, i) => (
                        <Radar key={a.id} name={a.sampleId.replace("TCGA-", "")} dataKey={a.sampleId.replace("TCGA-", "")} stroke={CHART_COLOR_LIST[i % CHART_COLOR_LIST.length]} fill={CHART_COLOR_LIST[i % CHART_COLOR_LIST.length]} fillOpacity={0.15} />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Biomarker analysis */}
              <Card>
                <CardHeader className="px-4 pt-4 pb-2">
                  <CardTitle className="text-base">Biomarker Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="text-sm font-medium">Subtype Agreement</span>
                    {result.subtypeAgreement
                      ? <span className="flex items-center gap-1 text-green-600 text-sm font-medium"><CheckCircle2 className="w-4 h-4" />Yes</span>
                      : <span className="flex items-center gap-1 text-amber-600 text-sm font-medium"><XCircle className="w-4 h-4" />No</span>}
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="text-sm font-medium">Biomarker Overlap</span>
                    <span className="text-primary font-bold">{formatPercent(result.biomarkerOverlap * 100)}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Shared Biomarkers</div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.sharedBiomarkers.map(b => <span key={b} className="text-xs font-mono px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">{b}</span>)}
                    </div>
                  </div>
                  {result.uniqueBiomarkers.map((u, i) => (
                    <div key={u.analysisId}>
                      <div className="text-sm font-medium mb-2" style={{ color: CHART_COLOR_LIST[i % CHART_COLOR_LIST.length] }}>Unique to {u.sampleId}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {u.biomarkers.map(b => <span key={b} className="text-xs font-mono px-2 py-1 rounded bg-secondary/60">{b}</span>)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
