import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchGenes, useGetGene } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CHART_COLOR_LIST, CHART_COLORS } from "@/lib/constants";
import { Search, Dna, TrendingUp, TrendingDown } from "lucide-react";

const relevanceColor: Record<string, string> = {
  oncogene:         "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  tumor_suppressor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  both:             "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  unknown:          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function GeneDetailDialog({ geneId, open, onClose }: { geneId: string | null; open: boolean; onClose: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading } = useGetGene(geneId ?? "", { query: { enabled: !!geneId } as any });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-primary" />
            {isLoading ? "Loading..." : data?.geneName ?? geneId}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
        ) : data ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Gene ID:</span> <span className="font-mono">{data.geneId}</span></div>
              <div><span className="text-muted-foreground">Chromosome:</span> <span className="font-mono">{data.chromosome}</span></div>
              <div><span className="text-muted-foreground">Cancer role:</span> <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${relevanceColor[data.cancerRelevance]}`}>{data.cancerRelevance.replace("_", " ")}</span></div>
              <div><span className="text-muted-foreground">Top mutation:</span> <span className="font-medium">{data.mutationTypes[0]?.type ?? "—"} ({((data.mutationTypes[0]?.frequency ?? 0) * 100).toFixed(0)}%)</span></div>
            </div>

            <div>
              <div className="text-sm font-medium mb-1">Description</div>
              <p className="text-sm text-muted-foreground">{data.description}</p>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Function</div>
              <p className="text-sm text-muted-foreground">{data.function}</p>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Expression by Cancer Subtype</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.expressionProfile} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis dataKey="subtype" tickFormatter={v => v.split(" ")[0]} fontSize={10} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => v.toFixed(3)} />
                  <Bar dataKey="meanExpression" name="Mean Expression" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {data.expressionProfile.map((_, i) => <Cell key={i} fill={CHART_COLOR_LIST[i % CHART_COLOR_LIST.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Mutation Types</div>
              <div className="flex flex-wrap gap-2">
                {data.mutationTypes.map(m => (
                  <div key={m.type} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm">
                    <span>{m.type}</span>
                    <span className="font-mono text-primary font-medium">{(m.frequency * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-2">Pathways</div>
                <div className="space-y-1">{data.pathways.map(p => <div key={p} className="text-xs px-2 py-1 rounded bg-secondary/50">{p}</div>)}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Related Genes</div>
                <div className="flex flex-wrap gap-1">{data.relatedGenes.map(g => <span key={g} className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">{g}</span>)}</div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function GeneLibrary() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const { data, isLoading, isFetching } = useSearchGenes({ q: query });
  const loading = isLoading || isFetching;
  const [selectedGeneId, setSelectedGeneId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["/api/genes/search"] });

  const handleRowClick = (geneId: string) => {
    setSelectedGeneId(geneId);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Gene Library"
          subtitle="Searchable database of cancer-associated genes with expression profiles and mutation data."
          loading={loading}
          onRefresh={handleRefresh}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="text-center"><CardContent className="pt-4 pb-4"><div className="text-2xl font-bold text-primary">{data?.length ?? "—"}</div><div className="text-sm text-muted-foreground">Genes</div></CardContent></Card>
          <Card className="text-center"><CardContent className="pt-4 pb-4"><div className="text-2xl font-bold" style={{ color: CHART_COLORS.red }}>{data?.filter(g => g.cancerRelevance === "oncogene").length ?? "—"}</div><div className="text-sm text-muted-foreground">Oncogenes</div></CardContent></Card>
          <Card className="text-center"><CardContent className="pt-4 pb-4"><div className="text-2xl font-bold" style={{ color: CHART_COLORS.blue }}>{data?.filter(g => g.cancerRelevance === "tumor_suppressor").length ?? "—"}</div><div className="text-sm text-muted-foreground">Tumour Suppressors</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="px-4 pt-4 pb-3">
            <CardTitle className="text-base">Gene Database</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by gene name or description..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gene Name</TableHead>
                      <TableHead>Gene ID</TableHead>
                      <TableHead>Chromosome</TableHead>
                      <TableHead>Cancer Role</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Expr. Mean</TableHead>
                      <TableHead className="text-right">Mut. Freq.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.map(gene => (
                      <TableRow key={gene.geneId} className="cursor-pointer hover:bg-muted/50" onClick={() => handleRowClick(gene.geneId)}>
                        <TableCell className="font-bold font-mono text-primary">{gene.geneName}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{gene.geneId}</TableCell>
                        <TableCell className="font-mono text-sm">{gene.chromosome}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${relevanceColor[gene.cancerRelevance]}`}>
                            {gene.cancerRelevance.replace("_", " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">{gene.description}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          <span className="flex items-center justify-end gap-1">
                            {(gene.expressionMean ?? 0) >= 0 ? <TrendingUp className="w-3 h-3 text-red-500" /> : <TrendingDown className="w-3 h-3 text-blue-500" />}
                            {gene.expressionMean?.toFixed(2) ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{gene.mutationFrequency !== null && gene.mutationFrequency !== undefined ? `${(gene.mutationFrequency * 100).toFixed(0)}%` : "—"}</TableCell>
                      </TableRow>
                    ))}
                    {data?.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No genes found matching "{query}"</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GeneDetailDialog geneId={selectedGeneId} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
