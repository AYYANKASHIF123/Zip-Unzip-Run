import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetDrugSensitivity, useGetDrugRecommendations } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import { CSVLink } from "react-csv";
import { Download, CheckCircle, XCircle, FlaskConical, AlertTriangle } from "lucide-react";

const SUBTYPES = [
  { label: "BRCA (Breast)",      id: "brca" },
  { label: "LUAD (Lung Adeno)",  id: "luad" },
  { label: "COAD (Colorectal)",  id: "coad" },
  { label: "GBM (Glioblastoma)", id: "gbm"  },
  { label: "PRAD (Prostate)",    id: "prad" },
];

const evidenceColor: Record<string, string> = {
  high:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function DrugSensitivity() {
  const queryClient = useQueryClient();
  const { data: sensitivity, isLoading: sLoading } = useGetDrugSensitivity();
  const [selectedSubtype, setSelectedSubtype] = useState("brca");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recommendations, isLoading: rLoading } = useGetDrugRecommendations(selectedSubtype, { query: { enabled: !!selectedSubtype } as any });
  const loading = sLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/drugs/sensitivity"] });
    queryClient.invalidateQueries({ queryKey: [`/api/drugs/recommendations/${selectedSubtype}`] });
  };

  const sortedSensitivity = sensitivity ? [...sensitivity].sort((a, b) => b.sensitivityScore - a.sensitivityScore) : [];

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Drug Sensitivity"
          subtitle="Predicted drug sensitivity scores and treatment exploration based on gene expression profiles."
          loading={loading}
          onRefresh={handleRefresh}
        />

        {/* Medical disclaimer */}
        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-800 dark:text-red-300">
            <strong>Important medical disclaimer:</strong> Drug sensitivity scores shown are <em>research predictions only</em>,
            derived from computational analysis of gene expression patterns. They do <strong>not</strong> constitute
            treatment recommendations, medical advice, or clinical guidance. Drug selection must be made by a qualified
            oncologist based on comprehensive clinical assessment. This tool is for research exploration only.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Sensitivity Overview</TabsTrigger>
            <TabsTrigger value="recommendations">By Cancer Subtype</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Drug Sensitivity Scores — All Subtypes</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Higher score = predicted higher sensitivity (research model output only)</p>
                </div>
                {!loading && sortedSensitivity.length > 0 && (
                  <CSVLink data={sortedSensitivity} filename="drug-sensitivity.csv"
                    className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground">
                    <Download className="w-3.5 h-3.5" />
                  </CSVLink>
                )}
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="w-full h-[320px]" /> : (
                  <ResponsiveContainer width="100%" height={320} debounce={0}>
                    <BarChart data={sortedSensitivity.slice(0, 15)} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                      <XAxis type="number" domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} fontSize={11} opacity={0.7} />
                      <YAxis type="category" dataKey="drugName" width={120} fontSize={11} opacity={0.85} />
                      <Tooltip
                        cursor={false}
                        isAnimationActive={false}
                        formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Sensitivity Score"]}
                      />
                      <Bar dataKey="sensitivityScore" name="Sensitivity Score" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        {sortedSensitivity.slice(0, 15).map((entry, i) => (
                          <Cell key={i} fill={entry.sensitivityScore > 0.7 ? CHART_COLORS.green : entry.sensitivityScore > 0.4 ? CHART_COLORS.blue : CHART_COLORS.red} />
                        ))}
                        <LabelList dataKey="sensitivityScore" position="right" formatter={(v: number) => `${(v * 100).toFixed(0)}%`} fontSize={10} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Table */}
            {!loading && sortedSensitivity.length > 0 && (
              <Card>
                <CardHeader className="px-4 pt-4 pb-2">
                  <CardTitle className="text-base">Full Drug Sensitivity Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Drug</TableHead>
                          <TableHead>Mechanism</TableHead>
                          <TableHead>Cancer Subtype</TableHead>
                          <TableHead className="text-right">Sensitivity</TableHead>
                          <TableHead className="text-right">Resistance</TableHead>
                          <TableHead>Prediction</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedSensitivity.map((drug, di) => (
                          <TableRow key={`${drug.drugName}-${di}`}>
                            <TableCell>
                              <div className="font-medium text-sm">{drug.drugName}</div>
                              <div className="text-xs text-muted-foreground">{drug.fdaApproved ? "FDA Approved" : "Investigational"}</div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{drug.mechanism}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{drug.cancerSubtype}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress value={drug.sensitivityScore * 100} className="w-16 h-1.5" />
                                <span className="font-mono text-sm w-12 text-right">{(drug.sensitivityScore * 100).toFixed(0)}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress value={drug.resistanceScore * 100} className="w-16 h-1.5" />
                                <span className="font-mono text-sm w-12 text-right text-red-500">{(drug.resistanceScore * 100).toFixed(0)}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {drug.sensitivityScore > drug.resistanceScore
                                ? <div className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="w-3.5 h-3.5" />Sensitive</div>
                                : <div className="flex items-center gap-1 text-red-500 text-xs"><XCircle className="w-3.5 h-3.5" />Resistant</div>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Cancer subtype:</span>
              <Select value={selectedSubtype} onValueChange={setSelectedSubtype}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBTYPES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {rLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
            ) : recommendations?.length ? (
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <Card key={`${rec.drugName}-${i}`} className="border-border/60">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <FlaskConical className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{rec.drugName}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${evidenceColor[rec.evidence as keyof typeof evidenceColor] ?? evidenceColor.medium}`}>
                                {rec.evidence} evidence
                              </span>
                              {rec.fdaApproved && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px]">FDA Approved</Badge>}
                              {i === 0 && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px]">Top recommendation</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{rec.mechanism}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Target gene: <span className="font-mono text-primary">{rec.targetGene}</span>{rec.phase ? ` · ${rec.phase}` : ""}</div>
                            {rec.combinationTherapy.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                <span className="text-xs text-muted-foreground">Combination:</span>
                                {rec.combinationTherapy.map(b => (
                                  <span key={b} className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">{b}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground mb-0.5">Sensitivity</div>
                          <div className="text-lg font-bold text-primary">{(rec.sensitivityScore * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-border/60">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No recommendations available for this subtype.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
