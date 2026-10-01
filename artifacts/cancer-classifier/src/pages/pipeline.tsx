import { useQueryClient } from "@tanstack/react-query";
import { useGetPipelineStages, useListPipelineRuns } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Loader2, Clock, AlertCircle, Cpu, Database, Zap } from "lucide-react";
import { formatPercent } from "@/lib/constants";
import { format } from "date-fns";

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  running:   <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
  pending:   <Clock className="w-5 h-5 text-gray-400" />,
  failed:    <AlertCircle className="w-5 h-5 text-red-500" />,
};

const statusBadge: Record<string, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  running:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pending:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  failed:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function ms(v: number | null) {
  if (v === null) return "—";
  if (v >= 60000) return `${(v / 60000).toFixed(1)}m`;
  return `${(v / 1000).toFixed(1)}s`;
}

export default function PipelineMonitor() {
  const queryClient = useQueryClient();
  const { data: pipeline, isLoading: pLoading } = useGetPipelineStages();
  const { data: runs, isLoading: rLoading } = useListPipelineRuns();
  const loading = pLoading || rLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/pipeline/stages"] });
    queryClient.invalidateQueries({ queryKey: ["/api/pipeline/runs"] });
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Pipeline Monitor"
          subtitle="End-to-end ML pipeline stages — from data ingestion to inference API."
          loading={loading}
          onRefresh={handleRefresh}
        />

        {/* Summary row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="text-center"><CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-primary">{pipeline?.stages.filter(s => s.status === "completed").length ?? "—"} / {pipeline?.stages.length ?? "—"}</div>
            <div className="text-sm text-muted-foreground">Stages Complete</div>
          </CardContent></Card>
          <Card className="text-center"><CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-500">{pipeline ? formatPercent(pipeline.overallProgress * 100) : "—"}</div>
            <div className="text-sm text-muted-foreground">Overall Progress</div>
          </CardContent></Card>
          <Card className="text-center"><CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-purple-500">{runs ? runs.filter(r => r.status === "completed").length : "—"}</div>
            <div className="text-sm text-muted-foreground">Successful Runs</div>
          </CardContent></Card>
          <Card className="text-center"><CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold" style={{ color: "#f59e0b" }}>{pipeline?.stages.reduce((a, s) => a + (s.durationMs ?? 0), 0) ? ms(pipeline!.stages.reduce((a, s) => a + (s.durationMs ?? 0), 0)) : "—"}</div>
            <div className="text-sm text-muted-foreground">Total Duration</div>
          </CardContent></Card>
        </div>

        {/* Overall progress bar */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pipeline Progress</CardTitle>
              {pipeline && <span className="text-sm text-muted-foreground">Model: {pipeline.stages.length ? "HistGradientBoosting v2.0" : ""} · Last run: {pipeline.lastRun ? format(new Date(pipeline.lastRun), "MMM d, HH:mm") : "—"}</span>}
            </div>
          </CardHeader>
          <CardContent>
            {pLoading ? <Skeleton className="h-4 w-full" /> : <Progress value={(pipeline?.overallProgress ?? 0) * 100} className="h-3" />}
          </CardContent>
        </Card>

        {/* Stages */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-base">Pipeline Stages</CardTitle></CardHeader>
          <CardContent>
            {pLoading ? (
              <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
            ) : (
              <div className="space-y-3">
                {pipeline?.stages.map((stage, i) => (
                  <div key={stage.id} className={`p-4 rounded-lg border ${stage.status === "running" ? "border-blue-500/50 bg-blue-50/30 dark:bg-blue-950/20" : stage.status === "completed" ? "bg-card/40" : "bg-muted/30"}`}>
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">{statusIcon[stage.status]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">S{stage.id}</span>
                            <span className="font-semibold">{stage.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusBadge[stage.status]}`}>{stage.status}</span>
                          </div>
                          <span className="text-sm text-muted-foreground shrink-0">{ms(stage.durationMs)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{stage.description}</p>
                        {stage.metrics && <div className="mt-1.5 text-xs font-mono text-primary">{stage.metrics}</div>}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {stage.technologies.map(t => (
                            <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-secondary/60">{t}</span>
                          ))}
                        </div>
                        {stage.status === "running" && (
                          <Progress value={stage.progress * 100} className="mt-2 h-1.5" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Run history */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-base">Recent Pipeline Runs</CardTitle></CardHeader>
          <CardContent>
            {rLoading ? <Skeleton className="w-full h-[200px]" /> : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run ID</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Samples</TableHead>
                      <TableHead className="text-right">Accuracy</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs?.map(run => (
                      <TableRow key={run.id}>
                        <TableCell className="font-mono text-sm">{run.id}</TableCell>
                        <TableCell className="text-sm">{format(new Date(run.startedAt), "MMM d, HH:mm")}</TableCell>
                        <TableCell className="text-sm">{run.completedAt ? format(new Date(run.completedAt), "MMM d, HH:mm") : "—"}</TableCell>
                        <TableCell><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusBadge[run.status]}`}>{run.status}</span></TableCell>
                        <TableCell className="text-right font-mono">{run.samplesProcessed}</TableCell>
                        <TableCell className="text-right font-mono">{run.accuracy ? formatPercent(run.accuracy * 100) : "—"}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{ms(run.durationMs)}</TableCell>
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
