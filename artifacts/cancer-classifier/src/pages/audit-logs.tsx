import { useState } from "react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CSVLink } from "react-csv";
import { Download, Search, ClipboardList, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { format, subHours, subDays, subMinutes } from "date-fns";

type LogAction =
  | "dataset_upload" | "dataset_delete" | "dataset_validate"
  | "preprocessing_run" | "preprocessing_fail"
  | "model_train" | "model_train_fail"
  | "prediction_generate" | "prediction_low_confidence"
  | "report_generate" | "export_action"
  | "role_change" | "pipeline_error";

interface AuditLog {
  id: string;
  action: LogAction;
  user: string;
  timestamp: Date;
  dataset?: string;
  model?: string;
  status: "success" | "failure" | "warning";
  detail: string;
}

const now = new Date();

const LOGS: AuditLog[] = [
  { id: "AL-001", action: "prediction_generate",       user: "Dr. A. Rahman",  timestamp: subMinutes(now, 8),  dataset: "TCGA-BRCA-2024", model: "GNN-AE v2.4.1",  status: "success", detail: "Classification: BRCA (Breast) — 96.1% confidence" },
  { id: "AL-002", action: "preprocessing_run",          user: "Dr. A. Rahman",  timestamp: subMinutes(now, 14), dataset: "TCGA-BRCA-2024",                           status: "success", detail: "6 stages completed. 147/150 samples passed QC (98%)" },
  { id: "AL-003", action: "dataset_upload",             user: "Dr. A. Rahman",  timestamp: subMinutes(now, 22), dataset: "TCGA-BRCA-2024",                           status: "success", detail: "CSV uploaded — 150 samples, 20,531 genes" },
  { id: "AL-004", action: "prediction_low_confidence",  user: "Prof. S. Chen",  timestamp: subMinutes(now, 45), dataset: "GEO-GSE29210",    model: "GNN-AE v2.4.1",  status: "warning", detail: "TCGA-BH-A0B3 — 54.2% confidence. Review recommended." },
  { id: "AL-005", action: "report_generate",            user: "Dr. A. Rahman",  timestamp: subHours(now, 1),   dataset: "TCGA-BRCA-2024",                           status: "success", detail: "Full analysis report exported (CSV, 2.3 MB)" },
  { id: "AL-006", action: "model_train",                user: "Prof. S. Chen",  timestamp: subHours(now, 2),                               model: "GNN-AE v2.4.1",  status: "success", detail: "Training completed. Accuracy: 92.4%, F1: 91.9%, Duration: 312s" },
  { id: "AL-007", action: "dataset_validate",           user: "Dr. A. Rahman",  timestamp: subHours(now, 3),   dataset: "TCGA-BRCA-2024",                           status: "success", detail: "Quality score: 94/100. 0 critical issues." },
  { id: "AL-008", action: "export_action",              user: "M. Thompson",    timestamp: subHours(now, 4),   dataset: "TCGA-LUAD-2023",                           status: "success", detail: "Biomarkers CSV exported (15 genes)" },
  { id: "AL-009", action: "preprocessing_fail",         user: "Prof. S. Chen",  timestamp: subHours(now, 5),   dataset: "GEO-GSE29210",                             status: "failure", detail: "Step 3 (Variance Filter) failed — missing gene annotations" },
  { id: "AL-010", action: "role_change",                user: "Prof. S. Chen",  timestamp: subHours(now, 6),                                                        status: "success", detail: "User M. Thompson role changed: viewer → researcher" },
  { id: "AL-011", action: "prediction_generate",        user: "Dr. A. Rahman",  timestamp: subHours(now, 8),   dataset: "TCGA-GBM-2022",   model: "GNN-AE v2.4.1",  status: "success", detail: "Classification: GBM (Glioblastoma) — 96.3% confidence" },
  { id: "AL-012", action: "model_train_fail",           user: "Dr. A. Rahman",  timestamp: subDays(now, 1),                               model: "Neural Net v1.3.0", status: "failure", detail: "Training failed at epoch 24/50 — CUDA OOM (reduced batch size)" },
  { id: "AL-013", action: "dataset_upload",             user: "M. Thompson",    timestamp: subDays(now, 1),    dataset: "GEO-GSE29210",                             status: "success", detail: "TSV uploaded — 89 samples, 17,814 genes" },
  { id: "AL-014", action: "report_generate",            user: "Prof. S. Chen",  timestamp: subDays(now, 2),    dataset: "TCGA-GBM-2022",                            status: "success", detail: "Biomarker discovery report generated" },
  { id: "AL-015", action: "dataset_delete",             user: "Prof. S. Chen",  timestamp: subDays(now, 3),    dataset: "CCLE-old-2021",                            status: "warning", detail: "Dataset archived and flagged for permanent deletion in 30 days" },
];

const ACTION_LABELS: Record<LogAction, string> = {
  dataset_upload:            "Dataset Upload",
  dataset_delete:            "Dataset Delete",
  dataset_validate:          "Dataset Validate",
  preprocessing_run:         "Preprocessing Run",
  preprocessing_fail:        "Preprocessing Failed",
  model_train:               "Model Training",
  model_train_fail:          "Model Training Failed",
  prediction_generate:       "Prediction Generated",
  prediction_low_confidence: "Low Confidence Warning",
  report_generate:           "Report Generated",
  export_action:             "Export Action",
  role_change:               "Role Change",
  pipeline_error:            "Pipeline Error",
};

const ACTION_CATEGORIES: Record<LogAction, string> = {
  dataset_upload: "dataset", dataset_delete: "dataset", dataset_validate: "dataset",
  preprocessing_run: "preprocessing", preprocessing_fail: "preprocessing",
  model_train: "model", model_train_fail: "model",
  prediction_generate: "prediction", prediction_low_confidence: "prediction",
  report_generate: "report", export_action: "export",
  role_change: "user", pipeline_error: "system",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  failure: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
};

const STATUS_BADGE: Record<string, string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failure: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = LOGS.filter(log => {
    const matchSearch = !search ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.detail.toLowerCase().includes(search.toLowerCase()) ||
      (log.dataset ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (log.model ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || ACTION_CATEGORIES[log.action] === categoryFilter;
    const matchStatus = statusFilter === "all" || log.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const counts = {
    success: LOGS.filter(l => l.status === "success").length,
    failure: LOGS.filter(l => l.status === "failure").length,
    warning: LOGS.filter(l => l.status === "warning").length,
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Audit Logs"
          subtitle="Complete event history for datasets, models, predictions, reports, and user actions."
        />

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Total Events", value: LOGS.length, color: "text-primary" },
            { label: "Success",      value: counts.success, color: "text-green-500" },
            { label: "Failures",     value: counts.failure, color: "text-red-500" },
            { label: "Warnings",     value: counts.warning, color: "text-amber-500" },
            { label: "Datasets",     value: LOGS.filter(l => ACTION_CATEGORIES[l.action] === "dataset").length,  color: "text-blue-500"   },
            { label: "Predictions",  value: LOGS.filter(l => ACTION_CATEGORIES[l.action] === "prediction").length, color: "text-purple-500" },
          ].map(s => (
            <Card key={s.label} className="text-center border-border/60">
              <CardContent className="pt-3 pb-3">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              Event Log
            </CardTitle>
            <CSVLink
              data={filtered.map(l => ({ ...l, timestamp: l.timestamp.toISOString(), action: ACTION_LABELS[l.action] }))}
              filename="audit-logs.csv"
              className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground"
            >
              <Download className="w-3.5 h-3.5" />
            </CSVLink>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search user, dataset, detail..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="dataset">Dataset</SelectItem>
                  <SelectItem value="preprocessing">Preprocessing</SelectItem>
                  <SelectItem value="model">Model</SelectItem>
                  <SelectItem value="prediction">Prediction</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5" />
                {filtered.length} of {LOGS.length} events
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Dataset / Model</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.id}</TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">{ACTION_LABELS[log.action]}</span>
                        <div className="text-[10px] text-muted-foreground capitalize">{ACTION_CATEGORIES[log.action]}</div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{log.user}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.dataset && <div className="font-mono">{log.dataset}</div>}
                        {log.model && <div className="text-primary/80">{log.model}</div>}
                        {!log.dataset && !log.model && <span className="opacity-40">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px]">{log.detail}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {STATUS_ICON[log.status]}
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[log.status]}`}>
                            {log.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(log.timestamp, "MMM d, HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-20 text-center text-muted-foreground text-sm">
                        No logs match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
