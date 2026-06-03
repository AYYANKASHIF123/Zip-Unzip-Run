import { useQueryClient } from "@tanstack/react-query";
import { useListReports } from "@workspace/api-client-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Loader2, FileBarChart, HeartPulse, GitBranch, BarChart3, ClipboardList } from "lucide-react";
import { format } from "date-fns";

const typeIcon: Record<string, React.ReactNode> = {
  comprehensive: <ClipboardList className="w-4 h-4" />,
  performance:   <BarChart3 className="w-4 h-4" />,
  survival:      <HeartPulse className="w-4 h-4" />,
  pathway:       <GitBranch className="w-4 h-4" />,
  analysis:      <FileBarChart className="w-4 h-4" />,
};

const typeColor: Record<string, string> = {
  comprehensive: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  performance:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  survival:      "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  pathway:       "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  analysis:      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const statusColor: Record<string, string> = {
  ready:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  generating: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  failed:     "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatSize(kb: number | null | undefined) {
  if (!kb) return "—";
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb.toFixed(0)} KB`;
}

export default function Reports() {
  const queryClient = useQueryClient();
  const { data: reports, isLoading, isFetching } = useListReports();
  const loading = isLoading || isFetching;

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["/api/reports"] });

  const ready = reports?.filter(r => r.status === "ready").length ?? 0;
  const generating = reports?.filter(r => r.status === "generating").length ?? 0;

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Reports"
          subtitle="Generate and download comprehensive analysis, performance, and clinical summary reports."
          loading={loading}
          onRefresh={handleRefresh}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="text-center"><CardContent className="pt-4 pb-4"><div className="text-2xl font-bold text-primary">{reports?.length ?? "—"}</div><div className="text-sm text-muted-foreground">Total Reports</div></CardContent></Card>
          <Card className="text-center"><CardContent className="pt-4 pb-4"><div className="text-2xl font-bold text-green-500">{ready}</div><div className="text-sm text-muted-foreground">Ready</div></CardContent></Card>
          <Card className="text-center"><CardContent className="pt-4 pb-4"><div className="text-2xl font-bold text-blue-500">{generating}</div><div className="text-sm text-muted-foreground">Generating</div></CardContent></Card>
          <Card className="text-center"><CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold" style={{ color: "#f59e0b" }}>
              {reports ? formatSize(reports.reduce((a, r) => a + (r.fileSizeKb ?? 0), 0)) : "—"}
            </div>
            <div className="text-sm text-muted-foreground">Total Size</div>
          </CardContent></Card>
        </div>

        {/* Report cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports?.map(report => (
              <Card key={report.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-lg ${typeColor[report.type]}`}>
                        {typeIcon[report.type] ?? <FileText className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm leading-tight">{report.title}</div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColor[report.type]}`}>{report.type}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColor[report.status]}`}>
                            {report.status === "generating" ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Generating…</span> : report.status}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                          <div>Created: {format(new Date(report.createdAt), "MMM d, yyyy HH:mm")}</div>
                          <div>Samples: {report.sampleCount} · Size: {formatSize(report.fileSizeKb)}</div>
                        </div>
                      </div>
                    </div>
                    {report.status === "ready" && (
                      <Button variant="outline" size="sm" className="shrink-0 h-8 text-xs gap-1">
                        <Download className="w-3.5 h-3.5" /> PDF
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Table view */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-base">All Reports</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="w-full h-[200px]" /> : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Samples</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports?.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.id}</TableCell>
                        <TableCell className="text-sm max-w-[260px] truncate font-medium">{r.title}</TableCell>
                        <TableCell><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColor[r.type]}`}>{r.type}</span></TableCell>
                        <TableCell className="text-sm">{format(new Date(r.createdAt), "MMM d, HH:mm")}</TableCell>
                        <TableCell><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColor[r.status]}`}>{r.status}</span></TableCell>
                        <TableCell className="text-right font-mono">{r.sampleCount}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatSize(r.fileSizeKb)}</TableCell>
                        <TableCell>{r.status === "ready" && <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Download className="w-3 h-3" /></Button>}</TableCell>
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
