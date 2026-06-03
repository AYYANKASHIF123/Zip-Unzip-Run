import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListAnalyses, useCreateAnalysis, useGetAnalysis } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/lib/constants";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain } from "lucide-react";

export default function Analyses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isFetching, dataUpdatedAt } = useListAnalyses();
  const createAnalysis = useCreateAnalysis();
  const loading = isLoading || isFetching;

  const [sampleId, setSampleId] = useState("");
  const [dataSource, setDataSource] = useState("TCGA");
  const [pollingId, setPollingId] = useState<number | null>(null);

  // Poll the newly-submitted analysis every 2s until the ML model finishes
  const { data: polledAnalysis } = useGetAnalysis(pollingId!, {
    query: {
      enabled: pollingId !== null,
      refetchInterval: 2000,
    } as never,
  });

  // When ML completes (or fails), refresh the whole list and stop polling
  useEffect(() => {
    if (!polledAnalysis) return;
    const status = (polledAnalysis as { status?: string }).status;
    if (status === "completed" || status === "failed") {
      setPollingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      if (status === "completed") {
        const subtype = (polledAnalysis as { cancerSubtype?: string }).cancerSubtype;
        const conf = (polledAnalysis as { confidenceScore?: number }).confidenceScore;
        toast({
          title: "Prediction complete",
          description: `${subtype ?? "Unknown"} — ${conf !== undefined ? formatPercent(conf * 100) : "–"} confidence`,
        });
      } else {
        toast({ title: "Prediction failed", variant: "destructive" });
      }
    }
  }, [polledAnalysis, queryClient, toast]);

  const lastRefreshed = useMemo(() => {
    if (!dataUpdatedAt) return null;
    const d = new Date(dataUpdatedAt);
    return `${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()} on ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }, [dataUpdatedAt]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleId.trim()) return;
    createAnalysis.mutate(
      { data: { sampleId, dataSource } },
      {
        onSuccess: (created) => {
          toast({ title: "Analysis submitted — running ML prediction…" });
          setSampleId("");
          // Start polling for this specific analysis
          setPollingId((created as { id?: number }).id ?? null);
          handleRefresh();
        },
        onError: () => {
          toast({ title: "Failed to submit analysis", variant: "destructive" });
        },
      }
    );
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
          title="Analyses"
          subtitle="Manage and submit gene expression analyses."
          lastRefreshed={lastRefreshed}
          loading={loading}
          onRefresh={handleRefresh}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* ── Submit form ── */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Submit New Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sampleId">Sample ID</Label>
                  <Input
                    id="sampleId"
                    value={sampleId}
                    onChange={(e) => setSampleId(e.target.value)}
                    placeholder="e.g. TCGA-02-0001"
                    disabled={createAnalysis.isPending || pollingId !== null}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataSource">Data Source</Label>
                  <Select
                    value={dataSource}
                    onValueChange={setDataSource}
                    disabled={createAnalysis.isPending || pollingId !== null}
                  >
                    <SelectTrigger id="dataSource">
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TCGA">TCGA</SelectItem>
                      <SelectItem value="ICGC">ICGC</SelectItem>
                      <SelectItem value="Internal">Internal DB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createAnalysis.isPending || pollingId !== null || !sampleId.trim()}
                >
                  {(createAnalysis.isPending || pollingId !== null) ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running ML…</>
                  ) : (
                    "Submit Analysis"
                  )}
                </Button>

                {pollingId !== null && (
                  <p className="text-xs text-center text-muted-foreground">
                    Random Forest is classifying 50 biomarker genes…
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* ── Results table ── */}
          <Card className="lg:col-span-3">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-base">All Analyses</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Sample ID</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Subtype</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.map((analysis) => {
                        const isPolling = pollingId !== null && (analysis as { id?: number }).id === pollingId;
                        return (
                          <TableRow
                            key={(analysis as { id?: number }).id}
                            className={isPolling ? "animate-pulse bg-blue-50 dark:bg-blue-950/20" : ""}
                          >
                            <TableCell className="text-sm font-mono text-muted-foreground">
                              #{(analysis as { id?: number }).id}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {(analysis as { sampleId?: string }).sampleId}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {(analysis as { dataSource?: string }).dataSource}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`${statusColors[(analysis as { status?: string }).status ?? "pending"]} border-0 font-medium capitalize`}
                              >
                                {isPolling && <Loader2 className="mr-1 h-3 w-3 animate-spin inline" />}
                                {(analysis as { status?: string }).status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {(analysis as { cancerSubtype?: string | null }).cancerSubtype ?? (isPolling ? "…" : "-")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(analysis as { confidenceScore?: number | null }).confidenceScore
                                ? formatPercent((analysis as { confidenceScore: number }).confidenceScore * 100)
                                : (isPolling ? "…" : "-")}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date((analysis as { createdAt?: string }).createdAt ?? new Date()), "MMM d, yyyy HH:mm")}
                            </TableCell>
                            <TableCell className="text-right">
                              {(analysis as { status?: string }).status === "completed" && (
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/results/${(analysis as { id?: number }).id}`}>View Results</Link>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!data || data.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                            No analyses found.
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
    </div>
  );
}
