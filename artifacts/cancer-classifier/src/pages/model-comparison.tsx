import { useQuery } from "@tanstack/react-query";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CSVLink } from "react-csv";
import { Download, Info, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CustomLegend, CustomTooltip, formatPercent } from "@/lib/constants";

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

export default function ModelComparison() {
  const registryQuery = useQuery<Registry>({
    queryKey: ["/api/models/versions"],
    queryFn: async () => {
      const response = await fetch("/api/models/versions");
      if (!response.ok) throw new Error("Could not load model registry");
      return response.json();
    },
    staleTime: 30_000,
  });

  const versions = registryQuery.data?.versions ?? [];
  const chartData = versions.map(version => ({
    model: version.name.replace(" (synthetic data — superseded)", ""),
    "CV Accuracy": +(version.cvAccuracy * 100).toFixed(2),
    "CV Weighted F1": +(version.cvF1 * 100).toFixed(2),
  }));

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1200px] mx-auto space-y-4">
        <HeaderControls
          title="Model Comparison"
          subtitle="Compare the active model with previous registered versions using their recorded cross-validation results."
          loading={registryQuery.isLoading}
          onRefresh={() => registryQuery.refetch()}
        />

        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
            Version metrics are shown with their original training data source. The previous Random Forest v1 used
            synthetic data, so its scores are not directly comparable to v2 trained on real TCGA PanCancer Atlas data.
            No unsupported precision, recall, AUC, or training-time estimates are shown.
          </AlertDescription>
        </Alert>

        {registryQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>Model registry is unavailable. Refresh after the ML service is running.</AlertDescription>
          </Alert>
        )}

        {registryQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        ) : versions.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No model versions are registered yet.</CardContent></Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {versions.map(version => (
                <Card key={version.id} className={version.isActive ? "border-green-300 dark:border-green-800" : "border-border/60"}>
                  <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {version.isActive && <Trophy className="w-4 h-4 text-green-600" />}
                      {version.name}
                    </CardTitle>
                    <Badge variant={version.isActive ? "default" : "outline"}>
                      {version.isActive ? "Active" : "Superseded"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div><div className="text-xs text-muted-foreground">5-fold CV accuracy</div><div className="text-xl font-bold text-primary">{formatPercent(version.cvAccuracy * 100)}</div></div>
                    <div><div className="text-xs text-muted-foreground">5-fold weighted CV F1</div><div className="text-xl font-bold">{formatPercent(version.cvF1 * 100)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Training data</div><div className="font-medium">{version.dataSource === "real_tcga_pancan_atlas" ? "Real TCGA PanCancer Atlas" : "Synthetic placeholder"}</div></div>
                    <div><div className="text-xs text-muted-foreground">Coverage</div><div className="font-medium">{version.nGenes} genes · {version.nSubtypes} subtypes</div></div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recorded Cross-Validation Metrics</CardTitle>
                <CSVLink
                  data={versions.map(v => ({
                    version: v.name,
                    status: v.isActive ? "Active" : "Superseded",
                    dataSource: v.dataSource,
                    cvAccuracy: v.cvAccuracy,
                    cvF1Weighted: v.cvF1,
                    genes: v.nGenes,
                    subtypes: v.nSubtypes,
                  }))}
                  filename="model-version-comparison.csv"
                  className="flex items-center justify-center w-[28px] h-[28px] rounded-md text-muted-foreground hover:bg-muted"
                >
                  <Download className="w-4 h-4" />
                </CSVLink>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300} debounce={0}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis dataKey="model" fontSize={10} />
                    <YAxis domain={[0, 100]} fontSize={11} tickFormatter={value => `${value}%`} />
                    <Tooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} />
                    <Legend content={<CustomLegend />} />
                    <Bar dataKey="CV Accuracy" fill="#0079F2" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="CV Weighted F1" fill="#795EFF" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}