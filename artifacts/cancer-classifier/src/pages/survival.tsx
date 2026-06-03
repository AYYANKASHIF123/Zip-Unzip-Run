import { useQueryClient } from "@tanstack/react-query";
import { useGetKaplanMeier } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CSVLink } from "react-csv";
import { Download } from "lucide-react";
import { useMemo } from "react";

const SUBTYPE_COLORS: Record<string, string> = {
  "BRCA (Breast)":      "#ec4899",
  "LUAD (Lung Adeno)":  "#0079F2",
  "COAD (Colon)":       "#009118",
  "GBM (Glioblastoma)": "#795EFF",
  "PRAD (Prostate)":    "#f59e0b",
};

function KaplanMeierTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm shadow-lg">
      <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">t = {label} months</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600 dark:text-gray-300">{p.name}:</span>
          <span className="font-medium">{(p.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

export default function SurvivalAnalysis() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useGetKaplanMeier();
  const loading = isLoading || isFetching;

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["/api/survival/kaplan-meier"] });

  // Merge all KM curves into a single array keyed by time
  const mergedData = useMemo(() => {
    if (!data?.curves.length) return [];
    const allTimes = [...new Set(data.curves.flatMap(c => c.points.map(p => p.time)))].sort((a, b) => a - b);
    return allTimes.map(t => {
      const row: Record<string, any> = { time: t };
      data.curves.forEach(curve => {
        const pt = curve.points.find(p => p.time === t);
        if (pt) row[curve.subtype] = pt.survival;
      });
      return row;
    });
  }, [data]);

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Survival Analysis"
          subtitle="Kaplan-Meier overall survival curves by cancer subtype from TCGA clinical data."
          loading={loading}
          onRefresh={handleRefresh}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />) :
            data?.medianSurvival.map(m => (
              <Card key={m.subtype} className="text-center">
                <CardContent className="pt-3 pb-3">
                  <div className="text-xs text-muted-foreground mb-1 truncate">{m.subtype.split(" ")[0]}</div>
                  <div className="text-2xl font-bold" style={{ color: SUBTYPE_COLORS[m.subtype] }}>{m.months < 200 ? m.months.toFixed(1) : m.months.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">months median OS</div>
                  <div className="text-[10px] text-muted-foreground mt-1">[{m.lower95.toFixed(1)}, {m.upper95.toFixed(1)}]</div>
                </CardContent>
              </Card>
            ))
          }
        </div>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Kaplan-Meier Overall Survival Curves</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Overall survival probability (Y) over time in months (X). Shaded regions represent 95% confidence intervals.</p>
            </div>
            {!loading && data && (
              <CSVLink data={mergedData} filename="kaplan-meier.csv"
                className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 text-muted-foreground">
                <Download className="w-3.5 h-3.5" />
              </CSVLink>
            )}
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="w-full h-[400px]" /> : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={mergedData} margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="time" label={{ value: "Time (months)", position: "insideBottom", offset: -10, fontSize: 12 }} fontSize={11} opacity={0.7} />
                  <YAxis domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} label={{ value: "Survival Probability", angle: -90, position: "insideLeft", fontSize: 12 }} fontSize={11} opacity={0.7} />
                  <ReferenceLine y={0.5} stroke="#6b7280" strokeDasharray="5 4" opacity={0.5} label={{ value: "50%", position: "right", fontSize: 10, fill: "#6b7280" }} />
                  <Tooltip content={<KaplanMeierTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: "16px", fontSize: "12px" }} />
                  {data?.curves.map(curve => (
                    <Line key={curve.subtype} type="stepAfter" dataKey={curve.subtype} stroke={curve.color}
                      strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-base">Median Overall Survival Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="w-full h-[200px]" /> : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cancer Subtype</TableHead>
                      <TableHead className="text-right">Median OS (months)</TableHead>
                      <TableHead className="text-right">95% CI Lower</TableHead>
                      <TableHead className="text-right">95% CI Upper</TableHead>
                      <TableHead className="text-right">5-Year Survival</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.medianSurvival.map(m => {
                      const fiveYr = data.curves.find(c => c.subtype === m.subtype)?.points.find(p => p.time >= 60);
                      return (
                        <TableRow key={m.subtype}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SUBTYPE_COLORS[m.subtype] }} />
                              <span className="font-medium">{m.subtype}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{m.months.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{m.lower95.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{m.upper95.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono">{fiveYr ? `${(fiveYr.survival * 100).toFixed(1)}%` : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
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
