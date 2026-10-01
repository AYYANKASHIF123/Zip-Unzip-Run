import { useQuery } from "@tanstack/react-query";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, ShieldAlert } from "lucide-react";
import { formatPercent } from "@/lib/constants";

type ModelVersion = {
  id: string;
  name: string;
  createdAt: string;
  params: Record<string, number | string | null>;
  cvAccuracy: number;
  cvF1: number;
  nGenes: number;
  nSubtypes: number;
  dataSource: string;
  isActive: boolean;
};

type Registry = {
  versions: ModelVersion[];
  activeVersionId: string | null;
};

export default function ModelPerformance() {
  const registryQuery = useQuery<Registry>({
    queryKey: ["/api/models/versions"],
    queryFn: async () => {
      const response = await fetch("/api/models/versions");
      if (!response.ok) throw new Error("Could not load the active model metrics");
      return response.json();
    },
    staleTime: 30_000,
  });
  const versions = registryQuery.data?.versions ?? [];
  const active = versions.find(version => version.isActive);

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1200px] mx-auto space-y-4">
        <HeaderControls
          title="Model Performance"
          subtitle="Cross-validation results reported by the active ML service model registry."
          loading={registryQuery.isLoading}
          onRefresh={() => registryQuery.refetch()}
        />

        {registryQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>Model registry is unavailable. Refresh after the ML service is running.</AlertDescription>
          </Alert>
        )}

        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
            Research benchmark only. These cross-validation results are not external validation, clinical performance,
            or evidence for diagnosis or treatment decisions.
          </AlertDescription>
        </Alert>

        {registryQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40" /><Skeleton className="h-40" />
          </div>
        ) : active ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">Active: {active.name}</Badge>
              <Badge variant="outline">{active.nGenes} genes</Badge>
              <Badge variant="outline">{active.nSubtypes} subtypes</Badge>
              <Badge variant="outline">5-fold cross-validation</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">CV Accuracy</div>
                  <div className="text-3xl font-bold text-primary mt-1">{formatPercent(active.cvAccuracy * 100)}</div>
                  <p className="text-xs text-muted-foreground mt-2">Mean accuracy across stratified folds.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">CV Weighted F1</div>
                  <div className="text-3xl font-bold text-primary mt-1">{formatPercent(active.cvF1 * 100)}</div>
                  <p className="text-xs text-muted-foreground mt-2">Weighted F1 across stratified folds.</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-base">Evaluation details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ["Model", active.name],
                  ["Training source", active.dataSource === "real_tcga_pancan_atlas" ? "Real TCGA PanCancer Atlas mRNA expression data (cBioPortal)" : active.dataSource],
                  ["Training cohort", "3,330 samples across BRCA, LUAD, COADREAD, GBM, and PRAD"],
                  ["Validation design", "5-fold stratified cross-validation; mean fold scores"],
                  ["Model inputs", `${active.nGenes} curated gene-expression features`],
                  ["Model version date", new Date(active.createdAt).toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-border/50 pb-2 last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium sm:text-right">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Per-subtype scores, ROC-AUC, and confusion matrices are not supplied by the active model registry, so
                this screen does not display the previous prototype’s simulated charts.
              </AlertDescription>
            </Alert>
          </>
        ) : (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No active model is registered.</CardContent></Card>
        )}
      </div>
    </div>
  );
}