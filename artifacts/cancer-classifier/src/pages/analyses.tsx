import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListAnalyses, useCreateAnalysis, useGetAnalysis } from "@workspace/api-client-react";
import Papa from "papaparse";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Brain, Download, FileSpreadsheet, Upload, CheckCircle2,
  AlertTriangle, XCircle, FileWarning,
} from "lucide-react";

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

// ── Real CSV upload validation ────────────────────────────────────────────────

interface ParsedRow {
  sampleId: string;
  values: Partial<Record<string, number>>;
  invalidCols: string[];
}

interface ValidationReport {
  rows: ParsedRow[];
  headers: string[];
  matchedGenes: string[];
  missingGenes: string[];
  extraColumns: string[];
  duplicateIds: string[];
  invalidRowCount: number;
  totalRows: number;
  blocking: string | null;
}

const GENE_SET = new Set<string>(GENES_50 as readonly string[]);
const NON_GENE_COLUMNS = new Set(["sample_id", "sampleid", "sample id", "id", "expected_subtype"]);

function validateCsvText(text: string): ValidationReport {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const headers = (parsed.meta.fields ?? []).map((h) => h.trim());
  const headerLookup = new Map(headers.map((h) => [h.toLowerCase(), h]));
  const idCol = headerLookup.get("sample_id") ?? headerLookup.get("sampleid") ?? headerLookup.get("sample id") ?? headerLookup.get("id") ?? headers[0];

  const matchedGenes = headers.filter((h) => GENE_SET.has(h));
  const missingGenes = (GENES_50 as readonly string[]).filter((g) => !headers.includes(g));
  const extraColumns = headers.filter((h) => !GENE_SET.has(h) && !NON_GENE_COLUMNS.has(h.toLowerCase()));

  const seenIds = new Set<string>();
  const duplicateIds: string[] = [];
  const rows: ParsedRow[] = [];
  let invalidRowCount = 0;

  for (const raw of parsed.data) {
    const sampleId = (idCol ? raw[idCol] : "")?.trim();
    if (!sampleId) continue;
    if (seenIds.has(sampleId)) duplicateIds.push(sampleId);
    seenIds.add(sampleId);

    const values: Partial<Record<string, number>> = {};
    const invalidCols: string[] = [];
    for (const gene of matchedGenes) {
      const cell = raw[gene];
      if (cell === undefined || cell === "") continue;
      const num = Number(cell);
      if (Number.isNaN(num)) invalidCols.push(gene);
      else values[gene] = num;
    }
    if (invalidCols.length > 0) invalidRowCount++;
    rows.push({ sampleId, values, invalidCols });
  }

  let blocking: string | null = null;
  if (headers.length === 0) blocking = "File appears empty or is not a valid CSV.";
  else if (matchedGenes.length === 0) blocking = "No recognized gene columns found — none of the 50 required biomarker genes matched the file headers.";
  else if (rows.length === 0) blocking = "No valid sample rows found (missing a sample ID column?).";

  return { rows, headers, matchedGenes, missingGenes, extraColumns, duplicateIds, invalidRowCount, totalRows: rows.length, blocking };
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

  // ── Real CSV upload state ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadIds, setUploadIds] = useState<number[]>([]);
  const [uploadDataSource, setUploadDataSource] = useState("Internal");

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

  // Poll the analyses list while uploaded samples are still processing
  useEffect(() => {
    if (uploadIds.length === 0) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
    }, 2000);
    return () => clearInterval(interval);
  }, [uploadIds, queryClient]);

  useEffect(() => {
    if (uploadIds.length === 0 || !data) return;
    const tracked = data.filter((a) => uploadIds.includes((a as { id: number }).id));
    if (tracked.length === uploadIds.length && tracked.every((a) => (a as { status: string }).status !== "processing" && (a as { status: string }).status !== "pending")) {
      const completed = tracked.filter((a) => (a as { status: string }).status === "completed").length;
      toast({
        title: "Batch prediction complete",
        description: `${completed} of ${uploadIds.length} sample(s) classified successfully.`,
      });
      setUploadIds([]);
    }
  }, [data, uploadIds, toast]);

  const handleFileSelected = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setReport(validateCsvText(text));
    };
    reader.readAsText(file);
  }, []);

  const handleRunUpload = () => {
    if (!report || report.blocking) return;
    setUploading(true);
    const samples = report.rows.map((r) => ({ sampleId: r.sampleId, values: r.values }));
    fetch(`${import.meta.env.BASE_URL}api/analyses/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples, dataSource: uploadDataSource }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<{ analyses: Array<{ id: number }> }>;
      })
      .then((body) => {
        toast({ title: `Uploaded ${samples.length} sample(s) — running predictions…` });
        setUploadIds(body.analyses.map((a) => a.id));
        setReport(null);
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      })
      .catch(() => {
        toast({ title: "Upload failed", description: "Could not submit CSV to the server.", variant: "destructive" });
      })
      .finally(() => setUploading(false));
  };

  const coveragePct = report ? Math.round((report.matchedGenes.length / GENES_50.length) * 100) : 0;
  const lowCoverage = report ? coveragePct < 70 : false;

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
            <CardContent className="space-y-4">
              {/* ── Real CSV upload ── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Upload Real CSV</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload your own gene expression CSV (sample_id + up to 50 biomarker gene columns). Missing genes are median-imputed automatically.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  {fileName ?? "Choose CSV File"}
                </Button>

                {report && (
                  <div className="rounded-md border p-3 space-y-2 text-xs">
                    {report.blocking ? (
                      <Alert variant="destructive" className="py-2">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle className="text-xs">Cannot process file</AlertTitle>
                        <AlertDescription className="text-xs">{report.blocking}</AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Rows detected</span>
                          <span className="font-medium">{report.totalRows}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Gene coverage</span>
                          <span className={`font-medium ${lowCoverage ? "text-amber-600" : "text-green-600"}`}>
                            {report.matchedGenes.length}/{GENES_50.length} ({coveragePct}%)
                          </span>
                        </div>
                        {lowCoverage && (
                          <Alert className="py-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-xs text-amber-800 dark:text-amber-400">
                              Low gene coverage (&lt;70%) — predictions will rely heavily on imputed values and may be less reliable.
                            </AlertDescription>
                          </Alert>
                        )}
                        {report.missingGenes.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Missing genes: </span>
                            <span className="font-mono">{report.missingGenes.slice(0, 6).join(", ")}{report.missingGenes.length > 6 ? ` +${report.missingGenes.length - 6} more` : ""}</span>
                          </div>
                        )}
                        {report.extraColumns.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Ignored columns: </span>
                            <span className="font-mono">{report.extraColumns.join(", ")}</span>
                          </div>
                        )}
                        {report.duplicateIds.length > 0 && (
                          <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                            <FileWarning className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <span>Duplicate sample IDs: {report.duplicateIds.join(", ")}</span>
                          </div>
                        )}
                        {report.invalidRowCount > 0 && (
                          <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                            <FileWarning className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <span>{report.invalidRowCount} row(s) contain non-numeric values (ignored).</span>
                          </div>
                        )}
                        {report.missingGenes.length === 0 && report.duplicateIds.length === 0 && report.invalidRowCount === 0 && (
                          <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>File validated — ready to run.</span>
                          </div>
                        )}

                        <Select value={uploadDataSource} onValueChange={setUploadDataSource} disabled={uploading}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Data source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Internal">Internal DB</SelectItem>
                            <SelectItem value="TCGA">TCGA</SelectItem>
                            <SelectItem value="ICGC">ICGC</SelectItem>
                            <SelectItem value="CSV Upload">CSV Upload</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          className="w-full gap-2"
                          onClick={handleRunUpload}
                          disabled={uploading}
                        >
                          {uploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading…</> : `Run Prediction (${report.totalRows} sample${report.totalRows === 1 ? "" : "s"})`}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {uploadIds.length > 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                    Classifying {uploadIds.length} uploaded sample(s)…
                  </p>
                )}
              </div>

              <Separator />

              {/* ── Sample data download ── */}
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

              <Separator />

              {/* ── Demo sample classification (seeded synthetic data) ── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Demo Sample Classification</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  This generates deterministic synthetic gene values from a Sample ID for testing and demonstration purposes — it does not use uploaded data.
                </p>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sampleId" className="text-xs">Sample ID</Label>
                    <Input
                      id="sampleId"
                      value={sampleId}
                      onChange={(e) => setSampleId(e.target.value)}
                      placeholder="e.g. TCGA-02-0001"
                      disabled={createAnalysis.isPending || pollingId !== null}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dataSource" className="text-xs">Data Source</Label>
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
                    variant="secondary"
                    className="w-full"
                    disabled={createAnalysis.isPending || pollingId !== null || !sampleId.trim()}
                  >
                    {(createAnalysis.isPending || pollingId !== null) ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running ML…</>
                    ) : (
                      "Run Demo Sample"
                    )}
                  </Button>

                  {pollingId !== null && (
                    <p className="text-xs text-center text-muted-foreground">
                      HistGradientBoosting v2 is classifying the 50-gene input…
                    </p>
                  )}
                </form>
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
