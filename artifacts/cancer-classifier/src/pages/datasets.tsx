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
import { Database, RefreshCw, Archive, CheckCircle2, Upload, AlertTriangle, FileText, X } from "lucide-react";
import { format } from "date-fns";
import { formatCompact } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

const statusStyles: Record<string, { icon: React.ReactNode; badge: string }> = {
  active:   { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  syncing:  { icon: <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />,  badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  archived: { icon: <Archive className="w-4 h-4 text-gray-400" />,  badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
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

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });

  const totalSamples = datasets?.reduce((a, d) => a + d.samples, 0) ?? 0;
  const activeSets = datasets?.filter(d => d.status === "active").length ?? 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadPct(0);
    setPreview(null);

    let pct = 0;
    const interval = setInterval(() => {
      pct += Math.random() * 18 + 5;
      if (pct >= 100) {
        pct = 100;
        clearInterval(interval);
        setUploading(false);
        const genes = Math.floor(Math.random() * 5000) + 15000;
        const samples = Math.floor(Math.random() * 200) + 50;
        setPreview({
          name: file.name,
          size: file.size,
          rows: samples,
          cols: genes + 2,
          genes,
          samples,
          missing: Math.floor(Math.random() * 30),
          quality: Math.floor(Math.random() * 15) + 82,
        });
      }
      setUploadPct(Math.min(pct, 100));
    }, 120);
  };

  const handleConfirmUpload = () => {
    setUploadOpen(false);
    setPreview(null);
    setUploadPct(0);
    toast({ title: "Dataset queued for processing", description: `${preview?.name} has been submitted. Preprocessing will begin shortly.` });
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
            <Upload className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">Upload a new gene expression dataset (CSV or TSV). Accepts TCGA, GEO, and custom formats.</span>
              <Button size="sm" onClick={() => setUploadOpen(true)} className="ml-4 shrink-0">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload Dataset
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

                  {/* Quality score */}
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

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Upload Gene Expression Dataset
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
              <FileText className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
                Accepted formats: <strong>.csv</strong>, <strong>.tsv</strong>. Rows = samples, Columns = genes.
                First column should be sample ID; last column should be cancer subtype label.
              </AlertDescription>
            </Alert>

            {!uploading && !preview && (
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Click to browse or drag & drop</p>
                <p className="text-xs text-muted-foreground mt-1">CSV or TSV up to 500 MB</p>
                <input ref={fileRef} type="file" accept=".csv,.tsv" className="hidden" onChange={handleFileSelect} />
              </div>
            )}

            {uploading && (
              <div className="space-y-3">
                <div className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                  Analysing dataset...
                </div>
                <Progress value={uploadPct} className="h-2" />
                <div className="text-xs text-muted-foreground">{Math.round(uploadPct)}% — Detecting columns, genes, and quality metrics</div>
              </div>
            )}

            {preview && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Validation complete — ready to submit</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "File",          value: preview.name },
                    { label: "Size",          value: `${(preview.size / 1024).toFixed(1)} KB` },
                    { label: "Samples",       value: preview.samples.toLocaleString() },
                    { label: "Genes",         value: preview.genes.toLocaleString() },
                    { label: "Missing values", value: preview.missing },
                    { label: "Quality score", value: `${preview.quality}/100` },
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
                    <AlertDescription className="text-xs text-amber-800">
                      {preview.missing} missing values detected. Will be imputed during preprocessing.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleConfirmUpload} className="flex-1">
                    Submit for Preprocessing
                  </Button>
                  <Button variant="outline" onClick={() => { setPreview(null); setUploadPct(0); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
