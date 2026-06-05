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
  params: {
    n_estimators: number;
    max_depth: number;
    min_samples_split: number;
    class_weight: string;
  };
  cvAccuracy: number;
  cvF1: number;
  nGenes: number;
  nSubtypes: number;
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

  const [nEstimators,     setNEstimators]     = useState(200);
  const [maxDepth,        setMaxDepth]        = useState(15);
  const [minSamplesSplit, setMinSamplesSplit] = useState(5);
  const [classWeight,     setClassWeight]     = useState("balanced");
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
          n_estimators:      nEstimators,
          max_depth:         maxDepth,
          min_samples_split: minSamplesSplit,
          class_weight:      classWeight,
        }),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({})) as Record<string, unknown>;
          throw new Error((err.detail as string) ?? "Training failed");
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
          subtitle="Retrain the Random Forest with custom hyperparameters and track version history."
          onRefresh={() => qc.invalidateQueries({ queryKey: ["/api/models/versions"] })}
        />

        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
            Each new version runs <strong>5-fold cross-validation</strong> for an honest accuracy estimate, then fits on the full
            synthetic TCGA training set. Training takes 5–15 seconds depending on tree count.
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
                    <span className="text-muted-foreground">CV F1-Score</span>
                    <span className="font-bold">{formatPercent(activeVersion.cvF1 * 100)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trees</span>
                    <span className="font-mono">{activeVersion.params.n_estimators}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Depth</span>
                    <span className="font-mono">{activeVersion.params.max_depth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Split</span>
                    <span className="font-mono">{activeVersion.params.min_samples_split}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Class Weight</span>
                    <Badge variant="outline" className="text-[10px]">{activeVersion.params.class_weight}</Badge>
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
              {/* n_estimators */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Number of Trees</Label>
                  <span className="text-sm font-mono font-bold text-primary">{nEstimators}</span>
                </div>
                <Slider
                  min={50} max={500} step={50}
                  value={[nEstimators]}
                  onValueChange={([v]) => setNEstimators(v)}
                  disabled={isTraining}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50 (faster)</span><span>500 (more accurate)</span>
                </div>
              </div>

              {/* max_depth */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Max Tree Depth</Label>
                  <span className="text-sm font-mono font-bold text-primary">{maxDepth}</span>
                </div>
                <Slider
                  min={5} max={30} step={5}
                  value={[maxDepth]}
                  onValueChange={([v]) => setMaxDepth(v)}
                  disabled={isTraining}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 (generalises)</span><span>30 (fits tightly)</span>
                </div>
              </div>

              {/* min_samples_split */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Min Samples per Split</Label>
                  <span className="text-sm font-mono font-bold text-primary">{minSamplesSplit}</span>
                </div>
                <Slider
                  min={2} max={20} step={1}
                  value={[minSamplesSplit]}
                  onValueChange={([v]) => setMinSamplesSplit(v)}
                  disabled={isTraining}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>2 (complex)</span><span>20 (regularised)</span>
                </div>
              </div>

              {/* class_weight */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Class Weight Strategy</Label>
                <Select value={classWeight} onValueChange={setClassWeight} disabled={isTraining}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">Balanced (recommended for imbalanced datasets)</SelectItem>
                    <SelectItem value="uniform">Uniform (equal weight per sample)</SelectItem>
                  </SelectContent>
                </Select>
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
                    F1 {formatPercent(lastTrained.cvF1 * 100)}.
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
                      <TableHead className="text-right">CV F1</TableHead>
                      <TableHead className="text-right">Trees</TableHead>
                      <TableHead className="text-right">Depth</TableHead>
                      <TableHead className="text-right">Min Split</TableHead>
                      <TableHead>Class Weight</TableHead>
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
                        <TableCell className="text-right font-mono">{v.params.n_estimators}</TableCell>
                        <TableCell className="text-right font-mono">{v.params.max_depth}</TableCell>
                        <TableCell className="text-right font-mono">{v.params.min_samples_split}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{v.params.class_weight}</Badge>
                        </TableCell>
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
