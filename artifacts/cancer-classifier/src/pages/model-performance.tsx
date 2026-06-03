import { useQueryClient } from "@tanstack/react-query";
import { useGetModelPerformance, useGetConfusionMatrix } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent, CHART_COLORS, CHART_COLOR_LIST, CustomTooltip, CustomLegend } from "@/lib/constants";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { CSVLink } from "react-csv";
import { Download } from "lucide-react";

export default function ModelPerformance() {
  const queryClient = useQueryClient();

  const perfQuery = useGetModelPerformance();
  const confQuery = useGetConfusionMatrix();

  const loading = perfQuery.isLoading || confQuery.isLoading || perfQuery.isFetching || confQuery.isFetching;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/metrics/model-performance"] });
    queryClient.invalidateQueries({ queryKey: ["/api/metrics/confusion-matrix"] });
  };

  const perf = perfQuery.data;
  const conf = confQuery.data;

  // Transform confusion matrix for a heatmap-like display or table
  // Recharts doesn't have a native heatmap, so we might just render a stylized table for the confusion matrix
  const confusionData = conf?.matrix.map((row, i) => {
    const obj: any = { actual: conf.labels[i] };
    row.forEach((val, j) => {
      obj[conf.labels[j]] = val;
    });
    return obj;
  });

  return (
    <div className="min-h-screen bg-background px-5 py-4 pt-[32px] pb-[32px] pl-[24px] pr-[24px]">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Model Performance"
          subtitle="Evaluation metrics and training history."
          loading={loading}
          onRefresh={handleRefresh}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Overall Accuracy" value={perf ? formatPercent(perf.overallAccuracy * 100) : "0%"} loading={loading} color={CHART_COLORS.blue} />
          <KPICard title="Overall Precision" value={perf ? formatPercent(perf.overallPrecision * 100) : "0%"} loading={loading} color={CHART_COLORS.purple} />
          <KPICard title="Overall Recall" value={perf ? formatPercent(perf.overallRecall * 100) : "0%"} loading={loading} color={CHART_COLORS.green} />
          <KPICard title="Overall F1-Score" value={perf ? formatPercent(perf.overallF1Score * 100) : "0%"} loading={loading} color={CHART_COLORS.pink} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Training History (Accuracy & Loss)</CardTitle>
              {!loading && perf?.trainingHistory && (
                <CSVLink
                  data={perf.trainingHistory}
                  filename="training-history.csv"
                  className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground"
                >
                  <Download className="w-3.5 h-3.5" />
                </CSVLink>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="w-full h-[300px]" />
              ) : (
                <ResponsiveContainer width="100%" height={300} debounce={0}>
                  <LineChart data={perf?.trainingHistory}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="epoch" fontSize={12} opacity={0.6} />
                    <YAxis yAxisId="left" fontSize={12} opacity={0.8} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} opacity={0.8} />
                    <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                    <Legend content={<CustomLegend />} />
                    <Line yAxisId="left" type="monotone" dataKey="trainAccuracy" name="Train Acc" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line yAxisId="left" type="monotone" dataKey="valAccuracy" name="Val Acc" stroke={CHART_COLORS.purple} strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="trainLoss" name="Train Loss" stroke={CHART_COLORS.red} strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Per-Subtype Metrics (F1-Score)</CardTitle>
              {!loading && perf?.perSubtypeMetrics && (
                <CSVLink
                  data={perf.perSubtypeMetrics}
                  filename="subtype-metrics.csv"
                  className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground"
                >
                  <Download className="w-3.5 h-3.5" />
                </CSVLink>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="w-full h-[300px]" />
              ) : (
                <ResponsiveContainer width="100%" height={300} debounce={0}>
                  <BarChart data={perf?.perSubtypeMetrics}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis dataKey="subtype" fontSize={12} opacity={0.6} />
                    <YAxis tickFormatter={(v) => formatPercent(v * 100)} fontSize={12} opacity={0.8} />
                    <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={false} />
                    <Bar dataKey="f1Score" name="F1-Score" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {perf?.perSubtypeMetrics.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLOR_LIST[index % CHART_COLOR_LIST.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Confusion Matrix</CardTitle>
            {!loading && confusionData && (
                <CSVLink
                  data={confusionData}
                  filename="confusion-matrix.csv"
                  className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground"
                >
                  <Download className="w-3.5 h-3.5" />
                </CSVLink>
              )}
          </CardHeader>
          <CardContent>
            {loading ? (
               <Skeleton className="w-full h-[300px]" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border text-sm text-center">
                  <thead>
                    <tr>
                      <th className="border border-border p-2 bg-muted/50 w-24">True \ Pred</th>
                      {conf?.labels.map((label) => (
                        <th key={label} className="border border-border p-2 bg-muted/50 font-medium">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {conf?.matrix.map((row, i) => (
                      <tr key={conf.labels[i]}>
                        <th className="border border-border p-2 bg-muted/50 font-medium text-left">{conf.labels[i]}</th>
                        {row.map((val, j) => {
                          const isDiagonal = i === j;
                          // simple heat color
                          const alpha = Math.min(val / 100, 1) * 0.8;
                          const bgColor = isDiagonal ? `rgba(0, 145, 24, ${alpha + 0.1})` : `rgba(166, 8, 8, ${alpha})`;
                          const textColor = alpha > 0.5 ? '#fff' : 'inherit';
                          
                          return (
                            <td key={j} className="border border-border p-3 font-mono" style={{ backgroundColor: val > 0 ? bgColor : undefined, color: textColor }}>
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
