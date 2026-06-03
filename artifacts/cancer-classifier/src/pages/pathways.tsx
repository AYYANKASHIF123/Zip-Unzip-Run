import { useQueryClient } from "@tanstack/react-query";
import { useGetPathwayEnrichment, useGetGoTerms } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { CHART_COLORS, CHART_COLOR_LIST } from "@/lib/constants";
import { CSVLink } from "react-csv";
import { Download } from "lucide-react";

const categoryColors: Record<string, string> = {
  Cancer:    CHART_COLORS.red,
  Signaling: CHART_COLORS.blue,
  "Cell Cycle": CHART_COLORS.purple,
  Metabolism: CHART_COLORS.green,
};

const ontologyLabels: Record<string, string> = { BP: "Biological Process", MF: "Molecular Function", CC: "Cellular Component" };
const ontologyColors: Record<string, string> = { BP: CHART_COLORS.blue, MF: CHART_COLORS.green, CC: CHART_COLORS.purple };

export default function PathwayAnalysis() {
  const queryClient = useQueryClient();
  const { data: pathways, isLoading: pLoading } = useGetPathwayEnrichment();
  const { data: goTerms, isLoading: gLoading } = useGetGoTerms();
  const loading = pLoading || gLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/pathways/enrichment"] });
    queryClient.invalidateQueries({ queryKey: ["/api/pathways/go-terms"] });
  };

  const pathwayChartData = pathways?.map(p => ({
    ...p,
    negLogP: +(-Math.log10(p.adjustedPValue)).toFixed(2),
    shortName: p.pathwayName.length > 30 ? p.pathwayName.slice(0, 30) + "…" : p.pathwayName,
  })) ?? [];

  const goChartData = goTerms?.map(t => ({
    ...t,
    negLogP: +(-Math.log10(t.pValue)).toFixed(2),
    shortName: t.termName.length > 35 ? t.termName.slice(0, 35) + "…" : t.termName,
  })) ?? [];

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Pathway Analysis"
          subtitle="KEGG pathway enrichment and Gene Ontology (GO) term analysis for differentially expressed genes."
          loading={loading}
          onRefresh={handleRefresh}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["Cancer","Signaling","Cell Cycle","Metabolism"].map(cat => (
            <Card key={cat} className="text-center"><CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold" style={{ color: categoryColors[cat] ?? "#888" }}>
                {pathways?.filter(p => p.category === cat).length ?? "—"}
              </div>
              <div className="text-sm text-muted-foreground">{cat}</div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="kegg">
          <TabsList className="mb-4">
            <TabsTrigger value="kegg">KEGG Pathways</TabsTrigger>
            <TabsTrigger value="go">GO Terms</TabsTrigger>
          </TabsList>

          <TabsContent value="kegg">
            <div className="space-y-4">
              <Card>
                <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">Pathway Enrichment — Bubble Chart</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Bar height = −log₁₀(adjusted p-value). Longer bars = more significant enrichment.</p>
                  </div>
                  {!pLoading && pathways && <CSVLink data={pathways} filename="kegg-enrichment.csv" className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 text-muted-foreground"><Download className="w-3.5 h-3.5" /></CSVLink>}
                </CardHeader>
                <CardContent>
                  {pLoading ? <Skeleton className="w-full h-[320px]" /> : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={pathwayChartData} layout="vertical" margin={{ left: 195, right: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.12} horizontal={false} />
                        <XAxis type="number" label={{ value: "−log₁₀(adjusted p)", position: "insideBottom", offset: -5, fontSize: 11 }} fontSize={11} opacity={0.7} />
                        <YAxis type="category" dataKey="shortName" width={192} fontSize={11} />
                        <Tooltip formatter={(v: number) => v.toFixed(2)} labelFormatter={label => label} />
                        <Bar dataKey="negLogP" name="−log₁₀(p)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                          {pathwayChartData.map((entry, i) => (
                            <Cell key={i} fill={categoryColors[entry.category ?? ""] ?? CHART_COLOR_LIST[i % CHART_COLOR_LIST.length]} />
                          ))}
                          <LabelList dataKey="negLogP" position="right" style={{ fontSize: 10, fill: "currentColor" }} formatter={(v: number) => v.toFixed(1)} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-base">KEGG Enrichment Table</CardTitle></CardHeader>
                <CardContent>
                  {pLoading ? <Skeleton className="w-full h-[250px]" /> : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pathway ID</TableHead>
                            <TableHead>Pathway Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">p-value</TableHead>
                            <TableHead className="text-right">Adj. p-value</TableHead>
                            <TableHead className="text-right">Genes</TableHead>
                            <TableHead className="text-right">Ratio</TableHead>
                            <TableHead>Top Genes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pathways?.map(p => (
                            <TableRow key={p.pathwayId}>
                              <TableCell className="font-mono text-xs text-muted-foreground">{p.pathwayId}</TableCell>
                              <TableCell className="font-medium text-sm max-w-[200px]">{p.pathwayName}</TableCell>
                              <TableCell><span style={{ backgroundColor: `${categoryColors[p.category ?? ""]}22`, color: categoryColors[p.category ?? ""] ?? "#888" }} className="text-xs px-1.5 py-0.5 rounded font-medium">{p.category}</span></TableCell>
                              <TableCell className="text-right font-mono text-xs">{p.pValue.toExponential(2)}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{p.adjustedPValue.toExponential(2)}</TableCell>
                              <TableCell className="text-right font-mono">{p.geneCount}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{(p.geneRatio * 100).toFixed(0)}%</TableCell>
                              <TableCell className="text-xs">{p.genes.slice(0, 4).join(", ")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="go">
            <div className="space-y-4">
              <Card>
                <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">Gene Ontology (GO) Term Enrichment</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Enriched GO terms across BP (Biological Process), MF (Molecular Function), CC (Cellular Component).</p>
                  </div>
                  {!gLoading && goTerms && <CSVLink data={goTerms} filename="go-terms.csv" className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 text-muted-foreground"><Download className="w-3.5 h-3.5" /></CSVLink>}
                </CardHeader>
                <CardContent>
                  {gLoading ? <Skeleton className="w-full h-[300px]" /> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={goChartData} layout="vertical" margin={{ left: 210, right: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.12} horizontal={false} />
                        <XAxis type="number" label={{ value: "−log₁₀(p)", position: "insideBottom", offset: -5, fontSize: 11 }} fontSize={11} opacity={0.7} />
                        <YAxis type="category" dataKey="shortName" width={208} fontSize={10} />
                        <Tooltip formatter={(v: number) => v.toFixed(2)} />
                        <Bar dataKey="negLogP" name="−log₁₀(p)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                          {goChartData.map((entry, i) => <Cell key={i} fill={ontologyColors[entry.ontology] ?? CHART_COLOR_LIST[i % 3]} />)}
                          <LabelList dataKey="negLogP" position="right" style={{ fontSize: 10, fill: "currentColor" }} formatter={(v: number) => v.toFixed(1)} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-base">GO Terms Table</CardTitle></CardHeader>
                <CardContent>
                  {gLoading ? <Skeleton className="w-full h-[220px]" /> : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Term ID</TableHead>
                            <TableHead>Term Name</TableHead>
                            <TableHead>Ontology</TableHead>
                            <TableHead className="text-right">p-value</TableHead>
                            <TableHead className="text-right">Gene Count</TableHead>
                            <TableHead>Top Genes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {goTerms?.map(t => (
                            <TableRow key={t.termId}>
                              <TableCell className="font-mono text-xs">{t.termId}</TableCell>
                              <TableCell className="font-medium text-sm">{t.termName}</TableCell>
                              <TableCell>
                                <Badge style={{ backgroundColor: `${ontologyColors[t.ontology]}22`, color: ontologyColors[t.ontology] }} variant="outline" className="text-xs border-0">
                                  {t.ontology} — {ontologyLabels[t.ontology]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">{t.pValue.toExponential(2)}</TableCell>
                              <TableCell className="text-right font-mono">{t.geneCount}</TableCell>
                              <TableCell className="text-xs">{t.genes.slice(0, 4).join(", ")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
