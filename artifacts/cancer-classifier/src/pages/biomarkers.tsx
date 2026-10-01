import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListBiomarkers } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CHART_COLORS, CHART_COLOR_LIST, CustomTooltip } from "@/lib/constants";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CSVLink } from "react-csv";
import { Download, Search, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SUBTYPES = ["All", "BRCA (Breast)", "LUAD (Lung Adeno)", "COAD (Colorectal)", "GBM (Glioblastoma)", "PRAD (Prostate)"];
const SORT_OPTIONS = ["Expression Level", "Significance (p-value)", "Gene Name"];

export default function Biomarkers() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useListBiomarkers();
  const loading = isLoading || isFetching;

  const [subtypeFilter, setSubtypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Expression Level");
  const [search, setSearch] = useState("");

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/biomarkers"] });
  };

  const filtered = (data ?? []).filter(b => {
    const matchSubtype = subtypeFilter === "All" || b.cancerSubtype === subtypeFilter;
    const matchSearch = !search || b.geneName.toLowerCase().includes(search.toLowerCase()) || b.geneId.toLowerCase().includes(search.toLowerCase());
    return matchSubtype && matchSearch;
  }).sort((a, b) => {
    if (sortBy === "Expression Level") return b.expressionLevel - a.expressionLevel;
    if (sortBy === "Significance (p-value)") return a.significance - b.significance;
    return a.geneName.localeCompare(b.geneName);
  });

  const top10 = [...(data ?? [])].sort((a, b) => b.expressionLevel - a.expressionLevel).slice(0, 10);

  const stats = {
    total: data?.length ?? 0,
    significant: data?.filter(b => b.significance < 0.001).length ?? 0,
    subtypesRepresented: new Set(data?.map(b => b.cancerSubtype)).size,
    topGene: top10[0]?.geneName ?? "—",
  };

  return (
    <div className="min-h-screen bg-background px-5 py-4 pt-[32px] pb-[32px] pl-[24px] pr-[24px]">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Biomarker Discovery"
          subtitle="Research-grade biomarker candidates ranked by expression level and statistical significance."
          loading={loading}
          onRefresh={handleRefresh}
        />

        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Research disclaimer:</strong> Biomarkers listed here are <em>computational candidates</em> identified
            from gene expression analysis. They are not clinically validated biomarkers. All findings require independent
            biological validation, peer review, and clinical assessment before any research or medical use.
          </AlertDescription>
        </Alert>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Candidates",     value: loading ? "—" : stats.total,                color: "text-primary"   },
            { label: "Highly Significant",   value: loading ? "—" : stats.significant,           color: "text-green-500" },
            { label: "Cancer Types",         value: loading ? "—" : stats.subtypesRepresented,   color: "text-purple-500"},
            { label: "Top Candidate",        value: loading ? "—" : stats.topGene,               color: "text-pink-500"  },
          ].map(s => (
            <Card key={s.label} className="text-center border-border/60">
              <CardContent className="pt-3 pb-3">
                {loading ? <Skeleton className="h-7 w-16 mx-auto" /> : <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>}
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Top 10 Biomarkers by Expression Level</CardTitle>
            {!loading && top10.length > 0 && (
              <CSVLink data={top10} filename="top10-biomarkers.csv"
                className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground">
                <Download className="w-3.5 h-3.5" />
              </CSVLink>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="w-full h-[280px]" />
            ) : (
              <ResponsiveContainer width="100%" height={280} debounce={0}>
                <BarChart data={top10}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="geneName" fontSize={12} opacity={0.6} />
                  <YAxis fontSize={12} opacity={0.8} />
                  <Tooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} />
                  <Bar dataKey="expressionLevel" name="Expression Level" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {top10.map((_, i) => <Cell key={i} fill={CHART_COLOR_LIST[i % CHART_COLOR_LIST.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">All Identified Biomarker Candidates</CardTitle>
            {!loading && filtered.length > 0 && (
              <CSVLink data={filtered} filename="all-biomarkers.csv"
                className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground">
                <Download className="w-3.5 h-3.5" />
              </CSVLink>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search gene name or ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Select value={subtypeFilter} onValueChange={setSubtypeFilter}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBTYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[190px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(s => <SelectItem key={s} value={s}>Sort: {s}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground self-center">{filtered.length} candidates</div>
            </div>

            {loading ? (
              <div className="space-y-2 mt-4">
                <Skeleton className="h-10 w-full" />
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="rounded-md border mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Rank</TableHead>
                      <TableHead>Gene ID</TableHead>
                      <TableHead>Gene Name</TableHead>
                      <TableHead>Cancer Subtype</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead className="text-right">Expression Level</TableHead>
                      <TableHead className="text-right">Significance (p-value)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((biomarker, i) => (
                      <TableRow key={biomarker.geneId + biomarker.cancerSubtype}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm text-primary">{biomarker.geneId}</TableCell>
                        <TableCell className="font-medium text-sm">{biomarker.geneName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-secondary/50 font-normal text-xs">
                            {biomarker.cancerSubtype}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {biomarker.expressionLevel > 5
                            ? <div className="flex items-center gap-1 text-blue-600 text-xs"><TrendingUp className="w-3 h-3" />Up</div>
                            : <div className="flex items-center gap-1 text-red-600 text-xs"><TrendingDown className="w-3 h-3" />Down</div>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{biomarker.expressionLevel.toFixed(4)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          <span className={biomarker.significance < 0.001 ? "text-green-600 font-semibold" : biomarker.significance < 0.05 ? "text-amber-600" : "text-muted-foreground"}>
                            {biomarker.significance.toExponential(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No biomarkers match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
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
