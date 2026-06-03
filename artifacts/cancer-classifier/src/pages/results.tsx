import { useMemo } from "react";
import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetAnalysisResults, useGetAnalysis } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent, CHART_COLORS, CHART_COLOR_LIST, CustomTooltip } from "@/lib/constants";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CSVLink } from "react-csv";
import { Download, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

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
  const analysis = analysisQuery.data;

  return (
    <div className="min-h-screen bg-background px-5 py-4 pt-[32px] pb-[32px] pl-[24px] pr-[24px]">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild className="h-8 px-2">
            <Link href="/analyses">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Analyses
            </Link>
          </Button>
        </div>

        <HeaderControls
          title={`Analysis Report: ${analysis?.sampleId || "Loading..."}`}
          subtitle="Detailed classification results, probabilities, and biomarkers."
          loading={loading}
          onRefresh={handleRefresh}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-base">Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ) : results ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Predicted Subtype</p>
                    <p className="text-3xl font-bold" style={{ color: CHART_COLORS.blue }}>
                      {results.predictedSubtype}
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium">Confidence Score</p>
                      <p className="text-sm font-bold text-green-600">{formatPercent(results.confidenceScore * 100)}</p>
                    </div>
                    <Progress value={results.confidenceScore * 100} className="h-2" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-3">Treatment Pathways</p>
                    <div className="flex flex-wrap gap-2">
                      {results.treatmentPathways.map((pathway, i) => (
                        <Badge key={i} variant="secondary" className="bg-secondary/50">
                          {pathway}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Subtype Probabilities</CardTitle>
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
                <Skeleton className="w-full h-[250px]" />
              ) : (
                <ResponsiveContainer width="100%" height={250} debounce={0}>
                  <BarChart data={results?.subtypeProbabilities} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.2} />
                    <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => formatPercent(v * 100)} fontSize={12} opacity={0.6} />
                    <YAxis dataKey="subtype" type="category" fontSize={12} width={100} opacity={0.8} />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        return (
                          <div className="bg-popover border border-border text-popover-foreground px-3 py-2 rounded-md shadow-md text-sm">
                            <span className="font-medium">{payload[0].payload.subtype}:</span>{" "}
                            {formatPercent((payload[0].value as number) * 100)}
                          </div>
                        );
                      }}
                      isAnimationActive={false}
                    />
                    <Bar dataKey="probability" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {results?.subtypeProbabilities.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLOR_LIST[index % CHART_COLOR_LIST.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Top Biomarkers Contributing to Classification</CardTitle>
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
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results?.topBiomarkers.map((biomarker) => (
                      <TableRow key={biomarker.geneId}>
                        <TableCell className="font-mono text-sm">{biomarker.geneId}</TableCell>
                        <TableCell className="font-medium text-sm">{biomarker.geneName}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{biomarker.expressionLevel.toFixed(4)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{biomarker.significance.toExponential(2)}</TableCell>
                      </TableRow>
                    ))}
                    {(!results?.topBiomarkers || results.topBiomarkers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
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
      </div>
    </div>
  );
}
