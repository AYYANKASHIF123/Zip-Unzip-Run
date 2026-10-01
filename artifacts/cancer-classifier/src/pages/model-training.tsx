import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Cpu, Loader2, PlayCircle, Sparkles, Trophy, Info } from "lucide-react";
import { formatPercent } from "@/lib/constants";
import { format } from "date-fns";

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
  filePath: string;
};

type Registry = {
  versions: ModelVersion[];
  activeVersionId: string | null;
};

type TrainResult = {
  success: boolean;
  version: ModelVersion;
};

export default function ModelTraining() {
  const qc = useQueryClient();

  const [maxIter, setMaxIter] = useState(300);
  const [learningRate, setLearningRate] = useState(0.05);
  const [maxDepth, setMaxDepth] = useState<number | null>(null);
  const [l2Regularization, setL2Regularization] = useState(0);
  const [trainError,      setTrainError]      = useState<string | null>(null);
  const [lastTrained,     setLastTrained]     = useState<ModelVersion | null>(null);

  const registryQuery = useQuery<Registry>({
    queryKey: ["/api/models/versions"],
    queryFn: () => fetch("/api/models/versions").then(r => r.json()),
    staleTime: 30_000,
  });

  const trainMutation = useMutation<TrainResult, Error, void>({
    mutationFn: () =>
      fetch("/api/models/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_iter: maxIter,
          learning_rate: learningRate,
          max_depth: maxDepth,
          l2_regularization: l2Regularization,
        }),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({})) as Record<string, unknown>;
          throw new Error((err.detail as string) ?? (err.error as string) ?? "Training failed");
        }
        return r.json();
      }),
    onSuccess: data => {
      setTrainError(null);
      setLastTrained(data.version);
      qc.invalidateQueries({ queryKey: ["/api/models/versions"] });
      qc.invalidateQueries({ queryKey: ["/api/xai/importance"] });
    },
    onError: err => setTrainError(err.message),
  });

  const registry = registryQuery.data;
  const activeVersion = registry?.versions.find(v => v.isActive);
  const isTraining = trainMutation.isPending;

  const accuracyColor = (acc: number) =>
    acc >= 0.92 ? "text-green-500" : acc >= 0.88 ? "text-amber-500" : "text-red-500";

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1200px] mx-auto space-y-4">
        <HeaderControls
          title="Model Training"
          subtitle="Retrain HistGradientBoosting on the real TCGA-derived training cohort and track version history."
          onRefresh={() => qc.invalidateQueries({ queryKey: ["/api/models/versions"] })}
        />

        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
            Each new version runs <strong>5-fold stratified cross-validation</strong> on 3,330 real TCGA PanCancer Atlas samples,
            then fits on the full training set. Training takes several seconds.
            The newly trained model is immediately set as active and used for all future predictions.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Active Model ── */}
          <Card className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/5">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-green-500" />
                Active Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              {registryQuery.isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                </div>
              ) : activeVersion ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-mono font-bold text-primary">{activeVersion.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CV Accuracy</span>
                    <span className={`font-bold ${accuracyColor(activeVersion.cvAccuracy)}`}>
                      {formatPercent(activeVersion.cvAccuracy * 100)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">5-fold weighted CV F1</span>
                    <span className="font-bold">{formatPercent(activeVersion.cvF1 * 100)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Iterations</span>
                    <span className="font-mono">{activeVersion.params.max_iter ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Learning Rate</span>
                    <span className="font-mono">{activeVersion.params.learning_rate ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Depth / L2</span>
                    <span className="font-mono">{activeVersion.params.max_depth ?? "Unlimited"} / {activeVersion.params.l2_regularization ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Genes</span>
                    <span className="font-mono">{activeVersion.nGenes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trained</span>
                    <span className="text-xs">{format(new Date(activeVersion.createdAt), "d MMM yyyy, HH:mm")}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active model found.</p>
              )}
            </CardContent>
          </Card>

          {/* ── Train New Model ── */}
          <Card className="lg:col-span-2">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                Train New Model
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* max_iter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Boosting Iterations</Label>
                  <span className="text-sm font-mono font-bold text-primary">{maxIter}</span>
                </div>
                <Slider
                  min={100} max={500} step={50}
                  value={[maxIter]}
                  onValueChange={([v]) => setMaxIter(v)}
                  disabled={isTraining}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>100</span><span>500</span>
                </div>
              </div>

              {/* learning_rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Learning Rate</Label>
                  <span className="text-sm font-mono font-bold text-primary">{learningRate.toFixed(2)}</span>
                </div>
                <Slider
                  min={0.01} max={0.20} step={0.01}
                  value={[learningRate]}
                  onValueChange={([v]) => setLearningRate(v)}
                  disabled={isTraining}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.01</span><span>0.20</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Maximum Leaf Depth</Label>
                  <span className="text-sm font-mono font-bold text-primary">{maxDepth ?? "Unlimited"}</span>
                </div>
                <Select value={maxDepth === null ? "unlimited" : String(maxDepth)} onValueChange={v => setMaxDepth(v === "unlimited" ? null : Number(v))} disabled={isTraining}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">Unlimited (default)</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">L2 Regularization</Label>
                  <span className="text-sm font-mono font-bold text-primary">{l2Regularization.toFixed(1)}</span>
                </div>
                <Slider min={0} max={1} step={0.1} value={[l2Regularization]} onValueChange={([v]) => setL2Regularization(v)} disabled={isTraining} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>0 (none)</span><span>1.0 (stronger)</span></div>
              </div>

              {/* Error / success */}
              {trainError && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/10">
                  <AlertDescription className="text-xs text-red-700">{trainError}</AlertDescription>
                </Alert>
              )}
              {lastTrained && !isTraining && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-xs text-green-700">
                    <strong>{lastTrained.name}</strong> trained successfully —
                    CV accuracy {formatPercent(lastTrained.cvAccuracy * 100)},
                    weighted F1 {formatPercent(lastTrained.cvF1 * 100)}.
                    Now set as active model.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => trainMutation.mutate()}
                disabled={isTraining}
                className="w-full gap-2"
              >
                {isTraining ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Training… (running 5-fold CV)</>
                ) : (
                  <><PlayCircle className="w-4 h-4" /> Train New Version</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── Version History ── */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <CardTitle className="text-base">Version History</CardTitle>
          </CardHeader>
          <CardContent>
            {registryQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead className="text-right">CV Accuracy</TableHead>
                      <TableHead className="text-right">CV Weighted F1</TableHead>
                      <TableHead className="text-right">Iterations</TableHead>
                      <TableHead className="text-right">Learning Rate</TableHead>
                      <TableHead className="text-right">Max Depth</TableHead>
                      <TableHead className="text-right">L2</TableHead>
                      <TableHead>Trained</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(registry?.versions ?? []).map(v => (
                      <TableRow key={v.id} className={v.isActive ? "bg-green-50/40 dark:bg-green-900/5" : ""}>
                        <TableCell className="font-mono font-bold text-primary">{v.id}</TableCell>
                        <TableCell className={`text-right font-bold ${accuracyColor(v.cvAccuracy)}`}>
                          {formatPercent(v.cvAccuracy * 100)}
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatPercent(v.cvF1 * 100)}</TableCell>
                        <TableCell className="text-right font-mono">{v.params.max_iter ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono">{v.params.learning_rate ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono">{v.params.max_depth ?? "Unlimited"}</TableCell>
                        <TableCell className="text-right font-mono">{v.params.l2_regularization ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(v.createdAt), "d MMM yyyy, HH:mm")}
                        </TableCell>
                        <TableCell>
                          {v.isActive
                            ? <Badge className="bg-green-100 text-green-700 border-0 text-[10px]"><CheckCircle className="w-2.5 h-2.5 mr-1" />Active</Badge>
                            : <Badge variant="outline" className="text-[10px] text-muted-foreground">Previous</Badge>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
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
