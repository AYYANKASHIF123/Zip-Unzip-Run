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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, Download, FileSpreadsheet } from "lucide-react";

// ── Sample data generator ─────────────────────────────────────────────────────

const GENES_50 = [
  "ERBB2","PIK3CA","PTEN",  "BRAF",  "KRAS",  "CTNNB1","BRCA1", "BRCA2",
  "EGFR", "NRAS",  "TP53",  "CCND1", "MYC",   "SRC",   "PBRM1", "AR",
  "ESR1", "CDH1",  "RB1",   "CDKN2A","VHL",   "APC",   "MLH1",  "SMAD4",
  "FGFR1","FGFR2", "FGFR3", "ALK",   "MET",   "RET",   "NF1",   "NF2",
  "NOTCH1","NOTCH2","PDGFRA","KIT",   "IDH1",  "IDH2",  "TERT",  "CDKN1B",
  "PIK3R1","FOXO3", "AKT1",  "MTOR",  "ARID1A","SETD2", "KDM6A", "CREBBP",
  "EP300","DNMT3A",
] as const;

type GeneMap = Partial<Record<typeof GENES_50[number], number>>;

const SUBTYPE_PROFILES: Record<string, GeneMap> = {
  BRCA: {
    ERBB2:7.2, PIK3CA:5.8, CCND1:6.4, ESR1:7.8, SRC:5.6, MYC:5.2, FGFR1:5.0,
    BRCA1:1.2, BRCA2:1.4, PTEN:2.1, CDH1:1.6, RB1:2.8,
  },
  LUAD: {
    EGFR:7.8, KRAS:6.4, ALK:5.8, MET:6.2, FGFR2:5.0, NOTCH1:4.8,
    TP53:1.2, CDKN2A:1.8, RB1:1.6, NF1:1.4, SMAD4:2.2,
  },
  COAD: {
    CTNNB1:6.8, BRAF:6.2, KRAS:7.1, MYC:6.8, FGFR3:5.2, NOTCH2:5.0,
    APC:0.8, MLH1:1.4, SMAD4:1.6, PTEN:1.9, ARID1A:1.5,
  },
  GBM: {
    EGFR:8.4, PDGFRA:6.8, TERT:6.2, MYC:5.8, NRAS:5.2, KIT:5.0,
    PTEN:0.6, NF1:1.6, TP53:1.8, IDH1:0.9, IDH2:1.1,
  },
  PRAD: {
    AR:8.6, MYC:5.8, AKT1:5.2, MTOR:5.0, DNMT3A:4.8, KDM6A:4.6,
    PTEN:1.2, RB1:1.8, CDKN1B:1.6, NF1:2.1, FOXO3:1.8,
  },
};

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function generateSampleCSV(): string {
  const subtypes = ["BRCA","LUAD","COAD","GBM","PRAD"] as const;
  const rows: string[] = [["sample_id","expected_subtype",...GENES_50].join(",")];
  subtypes.forEach((subtype, si) => {
    for (let j = 0; j < 3; j++) {
      const rng   = lcg(si * 997 + j * 31 + 42);
      const profile = SUBTYPE_PROFILES[subtype];
      const vals  = GENES_50.map(g => {
        const base  = profile[g] ?? 3.2;
        const noise = (rng() - 0.5) * 0.8;
        return Math.max(0, base + noise).toFixed(3);
      });
      rows.push([`${subtype}-DEMO-${String(j+1).padStart(3,"0")}`, subtype, ...vals].join(","));
    }
  });
  return rows.join("\n");
}

function downloadCSV() {
  const csv  = generateSampleCSV();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href: url, download: "gene_expression_sample_data.csv",
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sample Data</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No real data? Download a ready-to-use CSV with <strong>15 samples</strong> (3 per cancer type) using biologically realistic gene expression patterns.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={downloadCSV}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Sample CSV
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  52 columns · 15 rows · all 5 cancer subtypes
                </p>
              </div>
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
