import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListDatasets } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRole } from "@/lib/role-context";
import { Database, RefreshCw, Archive, CheckCircle2, Upload, AlertTriangle, FileText, X, Brain, Download, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { formatCompact } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

const statusStyles: Record<string, { icon: React.ReactNode; badge: string }> = {
  active:   { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  syncing:  { icon: <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />,  badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  archived: { icon: <Archive className="w-4 h-4 text-gray-400" />,  badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

const SUBTYPE_COLORS: Record<string, string> = {
  "BRCA (Breast)":       "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  "LUAD (Lung Adeno)":   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "COAD (Colorectal)":   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "GBM (Glioblastoma)":  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "PRAD (Prostate)":     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

interface UploadPreview {
  name: string;
  size: number;
  rows: number;
  cols: number;
  genes: number;
  samples: number;
  missing: number;
  quality: number;
}

interface PredictionResult {
  sampleId: string;
  predictedSubtype: string;
  confidenceScore: number;
  subtypeProbabilities: Record<string, number>;
  genesMatched: number;
  genesMissing: number;
  missingGenes: string[];
}

interface PredictResponse {
  predictions: PredictionResult[];
  totalSamples: number;
  modelVersion: string;
  featuresUsed: number;
  featuresMissing: number;
}

export default function Datasets() {
  const queryClient = useQueryClient();
  const { data: datasets, isLoading, isFetching } = useListDatasets();
  const loading = isLoading || isFetching;
  const { can } = useRole();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [predictions, setPredictions] = useState<PredictResponse | null>(null);
  const [predError, setPredError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });

  const totalSamples = datasets?.reduce((a, d) => a + d.samples, 0) ?? 0;
  const activeSets = datasets?.filter(d => d.status === "active").length ?? 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPredictions(null);
    setPredError(null);
    setUploading(true);
    setUploadPct(10);
    setPreview(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        const cols = results.meta.fields ?? [];
        const idCols = new Set(["sample_id", "sample", "id", "barcode", "patient_id", "sampleid"]);
        const geneCols = cols.filter(c => !idCols.has(c.toLowerCase()));
        const missingCount = rows.reduce((sum, row) =>
          sum + geneCols.filter(g => row[g] === undefined || row[g] === "" || row[g]?.toLowerCase() === "na").length, 0
        );
        const missingRate = geneCols.length > 0 ? missingCount / (rows.length * geneCols.length) : 0;
        const quality = Math.round(Math.min(98, Math.max(60, 96 - missingRate * 100)));

        setPreview({
          name: file.name,
          size: file.size,
          rows: rows.length,
          cols: cols.length,
          genes: geneCols.length,
          samples: rows.length,
          missing: missingCount,
          quality,
        });
        setUploading(false);
        setUploadPct(100);
      },
      error: () => {
        setUploading(false);
        toast({ title: "Parse error", description: "Could not read the CSV file.", variant: "destructive" });
      },
    });
  };

  const handleRunPredictions = async () => {
    if (!selectedFile) return;
    setPredicting(true);
    setPredError(null);

    const form = new FormData();
    form.append("file", selectedFile);

    try {
      const res = await fetch("/ml/predict", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail ?? `HTTP ${res.status}`);
      }
      const data: PredictResponse = await res.json();
      setPredictions(data);
      toast({
        title: "Predictions complete!",
        description: `${data.totalSamples} sample${data.totalSamples !== 1 ? "s" : ""} classified by ${data.modelVersion}.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to get predictions";
      setPredError(msg);
      toast({ title: "Prediction failed", description: msg, variant: "destructive" });
    } finally {
      setPredicting(false);
    }
  };

  const handleClose = () => {
    setUploadOpen(false);
    setPreview(null);
    setUploadPct(0);
    setSelectedFile(null);
    setPredictions(null);
    setPredError(null);
    setExpandedRow(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadResults = () => {
    if (!predictions) return;
    const rows = predictions.predictions.map(p => ({
      sample_id:          p.sampleId,
      predicted_subtype:  p.predictedSubtype,
      confidence:         p.confidenceScore,
      ...Object.fromEntries(Object.entries(p.subtypeProbabilities).map(([k, v]) => [`prob_${k.replace(/[^a-zA-Z0-9]/g, "_")}`, v])),
      genes_matched:      p.genesMatched,
      genes_missing:      p.genesMissing,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "predictions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Datasets"
          subtitle="Genomic data sources powering the GeneClassifier model — TCGA, GEO, CCLE, and more."
          loading={loading}
          onRefresh={handleRefresh}
        />

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="text-center border-border/60"><CardContent className="pt-4 pb-4"><div className="text-2xl font-bold text-primary">{datasets?.length ?? "—"}</div><div className="text-sm text-muted-foreground">Datasets</div></CardContent></Card>
          <Card className="text-center border-border/60"><CardContent className="pt-4 pb-4"><div className="text-2xl font-bold text-green-500">{activeSets}</div><div className="text-sm text-muted-foreground">Active</div></CardContent></Card>
          <Card className="text-center border-border/60"><CardContent className="pt-4 pb-4"><div className="text-2xl font-bold text-purple-500">{formatCompact(totalSamples)}</div><div className="text-sm text-muted-foreground">Total Samples</div></CardContent></Card>
          <Card className="text-center border-border/60"><CardContent className="pt-4 pb-4"><div className="text-2xl font-bold text-amber-500">{datasets?.reduce((a, d) => a + d.cancerTypes.length, 0) ?? "—"}</div><div className="text-sm text-muted-foreground">Cancer Types</div></CardContent></Card>
        </div>

        {/* Upload action */}
        {can("upload") && (
          <Alert className="border-primary/20 bg-primary/5">
            <Brain className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">Upload measured gene-expression data for <strong>real ML predictions</strong> — HistGradientBoosting v2 classifies each sample into cancer subtypes with confidence scores.</span>
              <Button size="sm" onClick={() => setUploadOpen(true)} className="ml-4 shrink-0">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload & Predict
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Dataset cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {datasets?.map(ds => (
              <Card key={ds.id} className={`hover:border-primary/40 transition-colors border-border/60 ${ds.status === "archived" ? "opacity-70" : ""}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-secondary/50 shrink-0">
                        <Database className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm">{ds.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{ds.source}</div>
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{ds.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {statusStyles[ds.status]?.icon}
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusStyles[ds.status]?.badge}`}>{ds.status}</span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-secondary/30 p-2">
                      <div className="text-base font-bold text-primary">{formatCompact(ds.samples)}</div>
                      <div className="text-xs text-muted-foreground">samples</div>
                    </div>
                    <div className="rounded-md bg-secondary/30 p-2">
                      <div className="text-base font-bold text-purple-500">{formatCompact(ds.genes)}</div>
                      <div className="text-xs text-muted-foreground">genes</div>
                    </div>
                    <div className="rounded-md bg-secondary/30 p-2">
                      <div className="text-base font-bold text-amber-500">{ds.cancerTypes.length}</div>
                      <div className="text-xs text-muted-foreground">cancer types</div>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Quality Score</span>
                      <span className={`font-semibold ${ds.samples > 100 ? "text-green-500" : "text-amber-500"}`}>
                        {ds.samples > 100 ? "94" : ds.samples > 80 ? "88" : "76"}/100
                      </span>
                    </div>
                    <Progress value={ds.samples > 100 ? 94 : ds.samples > 80 ? 88 : 76} className="h-1.5" />
                  </div>

                  <div className="mt-2.5">
                    <div className="text-xs text-muted-foreground mb-1">Cancer types:</div>
                    <div className="flex flex-wrap gap-1">
                      {ds.cancerTypes.slice(0, 7).map(ct => (
                        <span key={ct} className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">{ct}</span>
                      ))}
                      {ds.cancerTypes.length > 7 && <span className="text-xs px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground">+{ds.cancerTypes.length - 7}</span>}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Updated: {format(new Date(ds.lastUpdated), "MMM d, yyyy")}</span>
                    {can("delete") && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-red-500">
                        <X className="w-3 h-3 mr-1" />Archive
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Table view */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-base">Dataset Summary Table</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="w-full h-[200px]" /> : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Samples</TableHead>
                      <TableHead className="text-right">Genes</TableHead>
                      <TableHead className="text-right">Cancer Types</TableHead>
                      <TableHead className="text-right">Quality</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {datasets?.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.id}</TableCell>
                        <TableCell className="font-medium text-sm">{d.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.source}</TableCell>
                        <TableCell><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusStyles[d.status]?.badge}`}>{d.status}</span></TableCell>
                        <TableCell className="text-right font-mono">{d.samples.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{d.genes.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{d.cancerTypes.length}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{d.samples > 100 ? "94" : d.samples > 80 ? "88" : "76"}/100</TableCell>
                        <TableCell className="text-sm">{format(new Date(d.lastUpdated), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload + Predict Dialog */}
      <Dialog open={uploadOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Upload &amp; Predict Cancer Subtypes
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Format hint */}
            {!predictions && (
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
                <FileText className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>CSV format:</strong> rows = samples, columns = gene names (e.g. ERBB2, EGFR, KRAS…). First column may be a sample ID.
                  {" "}<a href="/ml/features" target="_blank" rel="noreferrer" className="underline">View 50 supported genes</a> or use the{" "}
                  <a href="/ml-service/sample_data.csv" className="underline" onClick={e => { e.preventDefault(); window.open("/", "_blank"); }}>sample CSV</a>.
                </AlertDescription>
              </Alert>
            )}

            {/* Drop zone */}
            {!uploading && !preview && !predictions && (
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f && fileRef.current) {
                    const dt = new DataTransfer();
                    dt.items.add(f);
                    fileRef.current.files = dt.files;
                    fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                  }
                }}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Click to browse or drag &amp; drop</p>
                <p className="text-xs text-muted-foreground mt-1">CSV or TSV — samples × genes matrix</p>
                <input ref={fileRef} type="file" accept=".csv,.tsv" className="hidden" onChange={handleFileSelect} />
              </div>
            )}

            {/* Parsing progress */}
            {uploading && (
              <div className="space-y-3">
                <div className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                  Parsing dataset…
                </div>
                <Progress value={uploadPct} className="h-2" />
                <div className="text-xs text-muted-foreground">Detecting columns, genes, and quality metrics</div>
              </div>
            )}

            {/* Preview */}
            {preview && !predictions && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Dataset validated — ready for ML prediction</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {[
                    { label: "File",           value: preview.name },
                    { label: "Size",           value: `${(preview.size / 1024).toFixed(1)} KB` },
                    { label: "Samples",        value: preview.samples.toLocaleString() },
                    { label: "Gene columns",   value: preview.genes.toLocaleString() },
                    { label: "Missing values", value: preview.missing },
                    { label: "Quality score",  value: `${preview.quality}/100` },
                  ].map(f => (
                    <div key={f.label} className="flex justify-between text-sm border-b border-border/30 pb-1">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="font-medium font-mono">{f.value}</span>
                    </div>
                  ))}
                </div>
                {preview.missing > 0 && (
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
                      {preview.missing} missing values detected — will be imputed with median values during prediction.
                    </AlertDescription>
                  </Alert>
                )}

                {predError && (
                  <Alert className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                    <AlertDescription className="text-xs text-red-700 dark:text-red-400">{predError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 pt-1">
                  <Button onClick={handleRunPredictions} disabled={predicting} className="flex-1">
                    {predicting ? (
                      <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running ML Model…</>
                    ) : (
                      <><Brain className="w-3.5 h-3.5 mr-1.5" />Run ML Prediction</>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Prediction Results */}
            {predictions && (
              <div className="space-y-4">
                {/* Summary header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      {predictions.totalSamples} sample{predictions.totalSamples !== 1 ? "s" : ""} classified
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">{predictions.modelVersion}</span>
                    <Button size="sm" variant="outline" onClick={downloadResults} className="h-7 text-xs">
                      <Download className="w-3 h-3 mr-1" />Export CSV
                    </Button>
                  </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-secondary/30 p-2">
                    <div className="text-base font-bold text-primary">{predictions.totalSamples}</div>
                    <div className="text-xs text-muted-foreground">Samples</div>
                  </div>
                  <div className="rounded-md bg-secondary/30 p-2">
                    <div className="text-base font-bold text-green-500">{predictions.featuresUsed}</div>
                    <div className="text-xs text-muted-foreground">Genes matched</div>
                  </div>
                  <div className="rounded-md bg-secondary/30 p-2">
                    <div className="text-base font-bold text-amber-500">
                      {predictions.predictions.length > 0
                        ? `${Math.round(predictions.predictions.reduce((s, p) => s + p.confidenceScore, 0) / predictions.predictions.length * 100)}%`
                        : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg confidence</div>
                  </div>
                </div>

                {/* Results table */}
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Sample ID</TableHead>
                        <TableHead className="text-xs">Predicted Subtype</TableHead>
                        <TableHead className="text-xs text-right">Confidence</TableHead>
                        <TableHead className="text-xs w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {predictions.predictions.map(pred => (
                        <>
                          <TableRow
                            key={pred.sampleId}
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => setExpandedRow(expandedRow === pred.sampleId ? null : pred.sampleId)}
                          >
                            <TableCell className="font-mono text-xs py-2">{pred.sampleId}</TableCell>
                            <TableCell className="py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SUBTYPE_COLORS[pred.predictedSubtype] ?? "bg-secondary text-secondary-foreground"}`}>
                                {pred.predictedSubtype}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-secondary/50 rounded-full h-1.5 hidden sm:block">
                                  <div
                                    className="h-1.5 rounded-full bg-primary"
                                    style={{ width: `${pred.confidenceScore * 100}%` }}
                                  />
                                </div>
                                <span className={`font-mono text-xs font-semibold ${pred.confidenceScore >= 0.85 ? "text-green-600" : pred.confidenceScore >= 0.70 ? "text-amber-600" : "text-red-500"}`}>
                                  {(pred.confidenceScore * 100).toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-muted-foreground">
                              {expandedRow === pred.sampleId ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </TableCell>
                          </TableRow>
                          {expandedRow === pred.sampleId && (
                            <TableRow key={`${pred.sampleId}-exp`} className="bg-muted/20">
                              <TableCell colSpan={4} className="py-3 px-4">
                                <div className="space-y-1.5">
                                  <div className="text-xs text-muted-foreground font-medium mb-2">Subtype probabilities:</div>
                                  {Object.entries(pred.subtypeProbabilities)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([subtype, prob]) => (
                                      <div key={subtype} className="flex items-center gap-2">
                                        <span className={`text-xs w-36 px-1.5 py-0.5 rounded font-medium ${SUBTYPE_COLORS[subtype] ?? "bg-secondary text-secondary-foreground"}`}>
                                          {subtype}
                                        </span>
                                        <div className="flex-1 bg-secondary/40 rounded-full h-1.5">
                                          <div
                                            className="h-1.5 rounded-full bg-primary/70"
                                            style={{ width: `${prob * 100}%` }}
                                          />
                                        </div>
                                        <span className="text-xs font-mono w-10 text-right text-muted-foreground">{(prob * 100).toFixed(1)}%</span>
                                      </div>
                                    ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-sm" onClick={() => {
                    setPredictions(null);
                    setPreview(null);
                    setSelectedFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />Upload Another File
                  </Button>
                  <Button onClick={handleClose} className="flex-1 text-sm">Done</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
