import { HeaderControls } from "@/components/layout/HeaderControls";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPercent } from "@/lib/constants";
import {
  getGetModelEvaluationQueryKey,
  useGetModelEvaluation,
  useRunModelEvaluationChecks,
  type ModelEvaluationResponse,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Loader2, Play, ShieldAlert } from "lucide-react";

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

type Evaluation = NonNullable<ModelEvaluationResponse["evaluation"]>;

function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? "Not recorded" : formatPercent(value * 100);
}

function meanStdPercent(value: { mean: number | null; std: number | null } | null | undefined): string {
  if (value?.mean == null || value.std == null) return "Not recorded";
  return `${percent(value.mean)} ± ${percent(value.std)}`;
}

function statusBadge(status: string | null | undefined) {
  if (status === "pass") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">Pass</Badge>;
  if (status === "warning") return <Badge variant="secondary">Warning</Badge>;
  if (status === "fail") return <Badge variant="destructive">Fail</Badge>;
  return <Badge variant="outline">{status === "not_applicable" ? "Not applicable" : "Not recorded"}</Badge>;
}

export default function ModelPerformance() {
  const queryClient = useQueryClient();
  const registryQuery = useQuery<Registry>({
    queryKey: ["/api/models/versions"],
    queryFn: async () => {
      const response = await fetch("/api/models/versions");
      if (!response.ok) throw new Error("Could not load the active model metrics");
      return response.json();
    },
    staleTime: 30_000,
  });
  const evaluationQuery = useGetModelEvaluation({
    query: { queryKey: getGetModelEvaluationQueryKey(), staleTime: 30_000 },
  });
  const runChecksMutation = useRunModelEvaluationChecks({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetModelEvaluationQueryKey(), data);
        void registryQuery.refetch();
      },
    },
  });
  const versions = registryQuery.data?.versions ?? [];
  const active = versions.find(version => version.isActive);
  const evaluation = evaluationQuery.data?.evaluation ?? null;
  const confusionMatrix = evaluation?.heldOutTest.confusionMatrix ?? null;
  const trustChecks = evaluation?.trustChecks ?? null;
  const loading = registryQuery.isLoading || evaluationQuery.isLoading;

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1200px] mx-auto space-y-4">
        <HeaderControls
          title="Model Performance"
          subtitle="Recorded internal cross-validation and a fixed held-out evaluation for the active model configuration."
          loading={loading}
          onRefresh={() => {
            void registryQuery.refetch();
            void evaluationQuery.refetch();
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Recompute baselines, shuffled-label, seed-stability, and data checks for the active v2 configuration.
          </p>
          <Button
            onClick={() => runChecksMutation.mutate()}
            disabled={runChecksMutation.isPending || !active}
          >
            {runChecksMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Running checks…</>
              : <><Play className="h-4 w-4" /> Run checks</>}
          </Button>
        </div>
        {runChecksMutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {runChecksMutation.error instanceof Error
                ? runChecksMutation.error.message
                : "The result trust checks could not be completed."}
            </AlertDescription>
          </Alert>
        )}
        {runChecksMutation.isSuccess && (
          <Alert>
            <AlertDescription>Result trust checks were recomputed and stored for the active model.</AlertDescription>
          </Alert>
        )}

        {registryQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>Model registry is unavailable. Refresh after the ML service is running.</AlertDescription>
          </Alert>
        )}
        {evaluationQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>Stored evaluation results could not be loaded from the ML service.</AlertDescription>
          </Alert>
        )}

        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
            Research benchmark only — not external validation, clinical performance, or evidence for diagnosis or treatment.
            The held-out results below come from an evaluation-only fit on the development partition. The existing serving
            bundle was not changed and was previously fit on the full cohort, so these results are not an untouched test
            of that already-trained bundle.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : active ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                Active: {active.name}
              </Badge>
              <Badge variant="outline">{active.nGenes} genes</Badge>
              <Badge variant="outline">{active.nSubtypes} subtypes</Badge>
              {evaluation && <Badge variant="outline">Held-out evaluation stored</Badge>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Existing Internal CV Accuracy</div>
                  <div className="text-3xl font-bold text-primary mt-1">{percent(active.cvAccuracy)}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Registry score from the original full-cohort 5-fold cross-validation.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Existing Internal CV Weighted F1</div>
                  <div className="text-3xl font-bold text-primary mt-1">{percent(active.cvF1)}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Original full-cohort registry score; development-only CV is reported below.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="px-5 pt-5 pb-2">
                  <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                    Held-out test set (20% of TCGA cohort)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 pb-5">
                  {evaluation ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["Accuracy", evaluation.heldOutTest.accuracy],
                        ["Weighted F1", evaluation.heldOutTest.weightedF1],
                        ["Macro F1", evaluation.heldOutTest.macroF1],
                      ].map(([label, value]) => (
                        <div key={label as string} className="min-w-0">
                          <div className="text-xs text-muted-foreground">{label}</div>
                          <div className="text-xl font-bold text-primary mt-1">
                            {percent(value as number | null)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No held-out evaluation is stored for the active model version.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {evaluation ? (
              <>
                <Card>
                  <CardHeader className="px-4 pt-4 pb-2">
                    <CardTitle className="text-base">Internal cross-validation — development set only</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {evaluation.crossValidation.nSplits
                        ? `Stratified ${evaluation.crossValidation.nSplits}-fold CV on the 80% development partition.`
                        : "Development-only cross-validation; the fold count was not recorded."}
                      {" "}Values are mean ± standard deviation across folds.
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead>Mean</TableHead>
                          <TableHead>Standard deviation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          ["Accuracy", evaluation.crossValidation.metrics.accuracy],
                          ["Weighted F1", evaluation.crossValidation.metrics.weightedF1],
                          ["Macro F1", evaluation.crossValidation.metrics.macroF1],
                        ].map(([label, metric]) => {
                          const value = metric as { mean: number | null; std: number | null } | null;
                          return (
                            <TableRow key={label as string}>
                              <TableCell className="font-medium">{label as string}</TableCell>
                              <TableCell>{percent(value?.mean)}</TableCell>
                              <TableCell>{percent(value?.std)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-4 pt-4 pb-2">
                    <CardTitle className="text-base">Result Trust Checks</CardTitle>
                  </CardHeader>
                  {!trustChecks ? (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        No trust-check results are stored yet. Select “Run checks” to compute them using the fixed development and held-out partitions.
                      </p>
                    </CardContent>
                  ) : (
                    <CardContent className="space-y-5">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">Active model: {trustChecks.modelVersionId ?? "Not recorded"}</Badge>
                        <span>
                          Computed {trustChecks.computedAt ? new Date(trustChecks.computedAt).toLocaleString() : "Not recorded"}
                        </span>
                      </div>

                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold">Baseline comparison</h3>
                        <p className="text-xs text-muted-foreground">
                          Internal cross-validation uses the same stratified development folds; the held-out test set is only scored.
                          HistGradientBoosting v2 reuses the stored evaluation above, preserving those original results.
                        </p>
                        {trustChecks.baselineModels?.length ? (
                          <div className="overflow-x-auto">
                            <Table className="min-w-[880px]">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Model</TableHead>
                                  <TableHead>Internal CV accuracy</TableHead>
                                  <TableHead>Internal CV weighted F1</TableHead>
                                  <TableHead>Held-out accuracy</TableHead>
                                  <TableHead>Held-out weighted F1</TableHead>
                                  <TableHead>Held-out macro F1</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {trustChecks.baselineModels.map((row, index) => (
                                  <TableRow key={row.model ?? index}>
                                    <TableCell className="font-medium">{row.model ?? "Not recorded"}</TableCell>
                                    <TableCell>{meanStdPercent(row.developmentCV?.accuracy)}</TableCell>
                                    <TableCell>{meanStdPercent(row.developmentCV?.weightedF1)}</TableCell>
                                    <TableCell>{percent(row.heldOutTest?.accuracy)}</TableCell>
                                    <TableCell>{percent(row.heldOutTest?.weightedF1)}</TableCell>
                                    <TableCell>{percent(row.heldOutTest?.macroF1)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Baseline scores are not recorded.</p>
                        )}
                      </section>

                      <section className="space-y-2 rounded-md border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">Shuffled-label test</h3>
                          {statusBadge(trustChecks.shuffledLabelTest?.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Mean internal CV accuracy: <strong>{percent(trustChecks.shuffledLabelTest?.meanAccuracy)}</strong>
                          {" "}· chance: {percent(trustChecks.shuffledLabelTest?.chanceAccuracy)}
                          {" "}· class-prevalence chance: {percent(trustChecks.shuffledLabelTest?.prevalenceChanceAccuracy)}
                          {" "}· warning threshold: above {percent(trustChecks.shuffledLabelTest?.warningThreshold)}
                          {" "}· shuffle seed: {trustChecks.shuffledLabelTest?.seed ?? "Not recorded"}
                        </p>
                        {trustChecks.shuffledLabelTest?.status === "warning" && (
                          <Alert variant="destructive">
                            <AlertDescription>
                              Shuffled labels scored clearly above the configured chance threshold. Review for leakage before interpreting model scores.
                            </AlertDescription>
                          </Alert>
                        )}
                      </section>

                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold">Seed stability — internal cross-validation</h3>
                        <p className="text-sm text-muted-foreground">
                          Five independent stratified fold assignments; summary is the mean and standard deviation of each seed’s 5-fold mean.
                          Seeds: {trustChecks.seedStability?.seeds?.join(", ") ?? "Not recorded"}.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-muted-foreground">Accuracy across seeds</div>
                            <div className="font-semibold">{meanStdPercent(trustChecks.seedStability?.accuracy)}</div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-muted-foreground">Weighted F1 across seeds</div>
                            <div className="font-semibold">{meanStdPercent(trustChecks.seedStability?.weightedF1)}</div>
                          </div>
                        </div>
                        {trustChecks.seedStability?.runs?.length ? (
                          <div className="overflow-x-auto">
                            <Table className="min-w-[620px]">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Seed</TableHead>
                                  <TableHead>Fold</TableHead>
                                  <TableHead>Accuracy</TableHead>
                                  <TableHead>Weighted F1</TableHead>
                                  <TableHead>Seed accuracy mean</TableHead>
                                  <TableHead>Seed weighted F1 mean</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {trustChecks.seedStability.runs.flatMap((run, runIndex) =>
                                  (run.foldScores ?? []).map((fold, foldIndex) => (
                                    <TableRow key={`${run.seed ?? runIndex}-${fold.fold ?? foldIndex}`}>
                                      <TableCell>{run.seed ?? "Not recorded"}</TableCell>
                                      <TableCell>{fold.fold ?? "Not recorded"}</TableCell>
                                      <TableCell>{percent(fold.accuracy)}</TableCell>
                                      <TableCell>{percent(fold.weightedF1)}</TableCell>
                                      <TableCell>{percent(run.accuracyMean)}</TableCell>
                                      <TableCell>{percent(run.weightedF1Mean)}</TableCell>
                                    </TableRow>
                                  )),
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Per-fold seed scores are not recorded.</p>
                        )}
                      </section>

                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold">Leakage and data checks</h3>
                        {trustChecks.dataChecks?.checklist?.length ? (
                          <div className="space-y-2">
                            {trustChecks.dataChecks.checklist.map((check, index) => (
                              <div key={check.key ?? index} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="text-sm font-medium">{(check.key ?? "Check").replaceAll(/([A-Z])/g, " $1")}</div>
                                  <div className="text-xs text-muted-foreground">{check.details ?? "Details not recorded."}</div>
                                </div>
                                {statusBadge(check.status)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Leakage checklist is not recorded.</p>
                        )}
                        <div className="grid gap-2 text-sm sm:grid-cols-2">
                          <p>Exact duplicate samples in full cohort: <strong>{trustChecks.dataChecks?.exactDuplicateSamples ?? "Not recorded"}</strong></p>
                          <p>Exact gene vectors shared across partitions: <strong>{trustChecks.dataChecks?.exactDuplicateVectorsAcrossPartitions ?? "Not recorded"}</strong></p>
                          <p>Samples with all 50 gene features missing: <strong>{trustChecks.dataChecks?.allFeaturesMissingSamples ?? "Not recorded"}</strong></p>
                          <p>Sample ID column: <strong>{trustChecks.dataChecks?.sampleIdColumn ?? "Not available"}</strong></p>
                          <p>Sample IDs shared across partitions: <strong>{trustChecks.dataChecks?.sampleIdOverlapCount ?? "Not applicable"}</strong></p>
                          <p>Metadata columns present: <strong>{trustChecks.dataChecks?.metadataColumnsFound?.join(", ") || "Not recorded"}</strong></p>
                          <p>Forbidden feature columns: <strong>{trustChecks.dataChecks?.forbiddenFeatureColumns?.join(", ") || "None"}</strong></p>
                          <p>Features exclude ID/cohort/label columns: <strong>{trustChecks.dataChecks?.featuresExcludeMetadata == null ? "Not recorded" : trustChecks.dataChecks.featuresExcludeMetadata ? "Yes" : "No"}</strong></p>
                          <p>Overall missing gene values: <strong>{percent(trustChecks.dataChecks?.missingValues?.overallRate)}</strong></p>
                        </div>
                        {trustChecks.dataChecks?.missingValues?.topGenes?.length ? (
                          <div>
                            <div className="mb-1 text-sm font-medium">Genes with the highest missing-value rates</div>
                            <Table>
                              <TableHeader><TableRow><TableHead>Gene</TableHead><TableHead>Missing</TableHead></TableRow></TableHeader>
                              <TableBody>
                                {trustChecks.dataChecks.missingValues.topGenes.map((gene, index) => (
                                  <TableRow key={gene.gene ?? index}>
                                    <TableCell>{gene.gene ?? "Not recorded"}</TableCell>
                                    <TableCell>{percent(gene.missingRate)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : null}
                        {trustChecks.dataChecks?.classCounts && (
                          <div className="overflow-x-auto">
                            <div className="mb-1 text-sm font-medium">Class counts per partition</div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Partition</TableHead>
                                  {["BRCA", "LUAD", "COAD", "GBM", "PRAD"].map(label => <TableHead key={label}>{label}</TableHead>)}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {[
                                  ["Full cohort", trustChecks.dataChecks.classCounts.fullCohort],
                                  ["Development", trustChecks.dataChecks.classCounts.development],
                                  ["Held-out test", trustChecks.dataChecks.classCounts.heldOut],
                                ].map(([partition, counts]) => {
                                  const values = counts as NonNullable<typeof trustChecks.dataChecks.classCounts.fullCohort>;
                                  return (
                                    <TableRow key={partition as string}>
                                      <TableCell className="font-medium">{partition as string}</TableCell>
                                      {["BRCA", "LUAD", "COAD", "GBM", "PRAD"].map(label => (
                                        <TableCell key={label}>{values?.[label as keyof typeof values] ?? "Not recorded"}</TableCell>
                                      ))}
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </section>
                    </CardContent>
                  )}
                </Card>

                <Card>
                  <CardHeader className="px-4 pt-4 pb-2">
                    <CardTitle className="text-base">Held-out per-class performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Precision, recall, and F1 are computed per subtype on the held-out rows. Support is the number of true samples.
                    </p>
                    {evaluation.heldOutTest.perClass?.length ? <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>True subtype</TableHead>
                          <TableHead>Precision</TableHead>
                          <TableHead>Recall</TableHead>
                          <TableHead>F1</TableHead>
                          <TableHead>Support</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {evaluation.heldOutTest.perClass.map((row, index) => (
                          <TableRow key={row.subtype ?? index}>
                            <TableCell className="font-medium">{row.subtype ?? "Not recorded"}</TableCell>
                            <TableCell>{percent(row.precision)}</TableCell>
                            <TableCell>{percent(row.recall)}</TableCell>
                            <TableCell>{percent(row.f1)}</TableCell>
                            <TableCell>{row.support ?? "Not recorded"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table> : <p className="text-sm text-muted-foreground">Per-class metrics are not stored for this evaluation.</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-4 pt-4 pb-2">
                    <CardTitle className="text-base">Held-out confusion matrix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Counts only. Rows are true labels and columns are predicted labels, in the order BRCA, LUAD, COAD, GBM, PRAD.
                    </p>
                    {confusionMatrix ? <Table className="min-w-[640px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>True ↓ / Predicted →</TableHead>
                          {confusionMatrix.labels.map(label => (
                            <TableHead key={label} className="text-center">{label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {confusionMatrix.values.map((row, rowIndex) => (
                          <TableRow key={confusionMatrix.labels[rowIndex] ?? rowIndex}>
                            <TableCell className="font-medium">
                              {confusionMatrix.labels[rowIndex] ?? "Not recorded"}
                            </TableCell>
                            {row.map((count, columnIndex) => {
                              const maxCount = Math.max(...confusionMatrix.values.flat(), 1);
                              const strength = count / maxCount;
                              return (
                                <TableCell
                                  key={`${rowIndex}-${columnIndex}`}
                                  className="text-center tabular-nums"
                                  title={`${count} samples`}
                                  style={{
                                    backgroundColor: `rgba(37, 99, 235, ${count === 0 ? 0.04 : 0.12 + strength * 0.78})`,
                                    color: strength > 0.58 ? "#fff" : undefined,
                                  }}
                                >
                                  {count}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table> : <p className="text-sm text-muted-foreground">Confusion-matrix counts are not stored for this evaluation.</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-4 pt-4 pb-2">
                    <CardTitle className="text-base">Evaluation design and data</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {[
                      ["Training source", active.dataSource === "real_tcga_pancan_atlas" ? "TCGA PanCancer Atlas mRNA expression data via cBioPortal" : active.dataSource],
                      ["Cohort and split", evaluation.split ? `${evaluation.split.totalSamples.toLocaleString()} total: ${evaluation.split.developmentSamples.toLocaleString()} development / ${evaluation.split.testSamples.toLocaleString()} held out` : "Not recorded"],
                      ["Split ratio", evaluation.split ? `80% development / ${Math.round(evaluation.split.testFraction * 100)}% held-out test` : "Not recorded"],
                      ["Random seed", evaluation.split ? String(evaluation.split.randomState) : "Not recorded"],
                      ["Cross-validation", evaluation.crossValidation.nSplits ? `Stratified ${evaluation.crossValidation.nSplits}-fold CV on development partition only` : "Development-only CV; fold count not recorded"],
                      ["Class order", evaluation.split?.subtypeOrder.join(", ") ?? "Not recorded"],
                      ["Evaluation model", evaluation.modelVersionId ? `${evaluation.modelVersionId} hyperparameters; evaluation-only fitted copy` : "Not recorded"],
                      ["Evaluated at", evaluation.evaluatedAt ? new Date(evaluation.evaluatedAt).toLocaleString() : "Not recorded"],
                      ["Serving model changed?", "No — the active prediction bundle was not replaced or retrained"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-border/50 pb-2 last:border-0">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium sm:text-right">{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  The active model registry does not contain held-out evaluation results. No test metrics are shown until an evaluation is recorded for this model version.
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No active model is registered.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
