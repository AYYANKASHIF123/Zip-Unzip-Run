import { useState } from "react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRole } from "@/lib/role-context";
import { Settings as SettingsIcon, ShieldCheck, Save, Info, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { role, user, can } = useRole();
  const { toast } = useToast();
  const canEdit = can("settings");

  const [platformName, setPlatformName] = useState("GeneClassifier");
  const [orgName, setOrgName] = useState("Genomics Research Lab");
  const [researchMode, setResearchMode] = useState(true);
  const [activeModel, setActiveModel] = useState("hist-gradient-boosting");
  const [defaultNorm, setDefaultNorm] = useState("rpkm");
  const [defaultSplit, setDefaultSplit] = useState("80-20");
  const [reportBranding, setReportBranding] = useState("GeneClassifier Research Platform");
  const [exportFormat, setExportFormat] = useState("csv");
  const [disclaimer, setDisclaimer] = useState(
    "This platform is for research and educational purposes only. It does not diagnose cancer, replace clinical judgement, or provide treatment recommendations. All outputs must be validated by qualified medical professionals."
  );

  const handleSave = () => {
    if (!canEdit) return;
    toast({ title: "Settings saved", description: "Platform configuration updated successfully." });
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[900px] mx-auto space-y-4">
        <HeaderControls
          title="Settings"
          subtitle="Platform configuration, model defaults, and research preferences."
        />

        {!canEdit && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
              You are logged in as <strong>{role}</strong>. Only Admins can modify settings. Switch your role in the sidebar to enable editing.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Role */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground">User</span><div className="font-medium mt-0.5">{user.name}</div></div>
              <div><span className="text-muted-foreground">Email</span><div className="font-mono text-xs mt-0.5">{user.email}</div></div>
              <div><span className="text-muted-foreground">Department</span><div className="font-medium mt-0.5">{user.department}</div></div>
              <div><span className="text-muted-foreground">Role</span>
                <div className="mt-0.5">
                  <Badge className={
                    role === "admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0" :
                    role === "researcher" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0" :
                    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0"
                  }>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Permissions: {role === "admin" ? "Full platform access" : role === "researcher" ? "Upload, train, analyse, generate reports" : "View dashboard, reports, and completed results"}
            </div>
          </CardContent>
        </Card>

        {/* Platform settings */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-primary" />
              Platform Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="platform-name">Platform Name</Label>
                <Input id="platform-name" value={platformName} onChange={e => setPlatformName(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-name">Organisation Name</Label>
                <Input id="org-name" value={orgName} onChange={e => setOrgName(e.target.value)} disabled={!canEdit} />
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium">Research Mode</div>
                <div className="text-xs text-muted-foreground">When enabled, all prediction outputs include research-only disclaimers and confidence caveats.</div>
              </div>
              <Switch checked={researchMode} onCheckedChange={setResearchMode} disabled={!canEdit} />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="disclaimer">Default Disclaimer Text</Label>
              <Textarea
                id="disclaimer"
                value={disclaimer}
                onChange={e => setDisclaimer(e.target.value)}
                disabled={!canEdit}
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Shown on all clinical, prediction, and drug sensitivity pages.</p>
            </div>
          </CardContent>
        </Card>

        {/* Model settings */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-base">Model Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Active Model</Label>
                <Select value={activeModel} onValueChange={setActiveModel} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hist-gradient-boosting">HistGradientBoosting v2.0 (Active)</SelectItem>
                    <SelectItem value="random-forest">Random Forest v1 (superseded)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Used for all new prediction runs.</p>
              </div>
              <div className="space-y-1.5">
                  <Label>XAI Method</Label>
                <Select defaultValue="permutation-class-mean" disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permutation-class-mean">Permutation Importance + Class-Mean Delta (Active)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preprocessing defaults */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-base">Default Preprocessing Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Normalisation Method</Label>
                <Select value={defaultNorm} onValueChange={setDefaultNorm} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rpkm">RPKM</SelectItem>
                    <SelectItem value="tpm">TPM</SelectItem>
                    <SelectItem value="log2">Log2 Transform</SelectItem>
                    <SelectItem value="zscore">Z-Score</SelectItem>
                    <SelectItem value="minmax">Min-Max</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Train / Test Split</Label>
                <Select value={defaultSplit} onValueChange={setDefaultSplit} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80-20">80% / 20%</SelectItem>
                    <SelectItem value="70-30">70% / 30%</SelectItem>
                    <SelectItem value="90-10">90% / 10%</SelectItem>
                    <SelectItem value="cv5">5-Fold CV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Variance Filter (top genes)</Label>
                <Select defaultValue="top5000" disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top1000">Top 1,000</SelectItem>
                    <SelectItem value="top2000">Top 2,000</SelectItem>
                    <SelectItem value="top5000">Top 5,000</SelectItem>
                    <SelectItem value="top10000">Top 10,000</SelectItem>
                    <SelectItem value="all">All genes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Remove duplicates", default: true },
                { label: "Impute missing values", default: true },
                { label: "Log2 transform", default: true },
                { label: "Batch correction", default: false },
              ].map(opt => (
                <div key={opt.label} className="flex items-center gap-2">
                  <Switch defaultChecked={opt.default} disabled={!canEdit} />
                  <span className="text-sm">{opt.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report & Export */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-base">Report & Export Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="report-branding">Report Branding Header</Label>
                <Input id="report-branding" value={reportBranding} onChange={e => setReportBranding(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label>Default Export Format</Label>
                <Select value={exportFormat} onValueChange={setExportFormat} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="pdf">PDF (Phase 3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={!canEdit} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
          {!canEdit && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5" />
              Switch to Admin role in the sidebar to enable editing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
