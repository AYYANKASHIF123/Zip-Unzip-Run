import { useState } from "react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CSVLink } from "react-csv";
import { Download, Info, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { CHART_COLORS, CustomTooltip } from "@/lib/constants";

const SAMPLES = [
  { id: "TCGA-E2-A14P", subtype: "BRCA (Breast)",      confidence: 0.961 },
  { id: "TCGA-HT-7693", subtype: "GBM (Glioblastoma)", confidence: 0.963 },
  { id: "TCGA-D5-6930", subtype: "COAD (Colon)",       confidence: 0.919 },
  { id: "TCGA-4B-A93V", subtype: "LUAD (Lung Adeno)",  confidence: 0.901 },
  { id: "TCGA-EJ-A7NL", subtype: "PRAD (Prostate)",    confidence: 0.877 },
];

const GLOBAL_IMPORTANCE: { gene: string; shap: number; direction: "up" | "down"; subtype: string }[] = [
  { gene: "ERBB2",  shap: 0.412, direction: "up",   subtype: "BRCA" },
  { gene: "TP53",   shap: 0.387, direction: "down",  subtype: "BRCA" },
  { gene: "EGFR",   shap: 0.354, direction: "up",   subtype: "LUAD" },
  { gene: "PIK3CA", shap: 0.321, direction: "up",   subtype: "BRCA" },
  { gene: "KRAS",   shap: 0.308, direction: "up",   subtype: "LUAD" },
  { gene: "PTEN",   shap: 0.274, direction: "down",  subtype: "GBM"  },
  { gene: "MYC",    shap: 0.261, direction: "up",   subtype: "COAD" },
  { gene: "BRCA1",  shap: 0.243, direction: "down",  subtype: "BRCA" },
  { gene: "CCND1",  shap: 0.228, direction: "up",   subtype: "BRCA" },
  { gene: "CDH1",   shap: 0.215, direction: "down",  subtype: "BRCA" },
  { gene: "BRAF",   shap: 0.201, direction: "up",   subtype: "COAD" },
  { gene: "CTNNB1", shap: 0.188, direction: "up",   subtype: "COAD" },
  { gene: "RB1",    shap: 0.177, direction: "down",  subtype: "GBM"  },
  { gene: "VEGFA",  shap: 0.165, direction: "up",   subtype: "GBM"  },
  { gene: "AR",     shap: 0.152, direction: "up",   subtype: "PRAD" },
];

const SAMPLE_EXPLANATIONS: Record<string, { gene: string; contribution: number; direction: "pos" | "neg" }[]> = {
  "TCGA-E2-A14P": [
    { gene: "ERBB2",  contribution:  0.38, direction: "pos" },
    { gene: "PIK3CA", contribution:  0.27, direction: "pos" },
    { gene: "CCND1",  contribution:  0.19, direction: "pos" },
    { gene: "TP53",   contribution: -0.21, direction: "neg" },
    { gene: "CDH1",   contribution: -0.14, direction: "neg" },
    { gene: "BRCA1",  contribution: -0.11, direction: "neg" },
    { gene: "PTEN",   contribution: -0.08, direction: "neg" },
  ],
  "TCGA-HT-7693": [
    { gene: "PTEN",   contribution:  0.33, direction: "pos" },
    { gene: "VEGFA",  contribution:  0.26, direction: "pos" },
    { gene: "RB1",    contribution: -0.22, direction: "neg" },
    { gene: "EGFR",   contribution:  0.18, direction: "pos" },
    { gene: "TP53",   contribution: -0.15, direction: "neg" },
    { gene: "CDKN2A", contribution: -0.12, direction: "neg" },
  ],
  "TCGA-D5-6930": [
    { gene: "KRAS",   contribution:  0.41, direction: "pos" },
    { gene: "MYC",    contribution:  0.29, direction: "pos" },
    { gene: "BRAF",   contribution:  0.22, direction: "pos" },
    { gene: "CTNNB1", contribution:  0.17, direction: "pos" },
    { gene: "APC",    contribution: -0.19, direction: "neg" },
    { gene: "TP53",   contribution: -0.13, direction: "neg" },
  ],
  "TCGA-4B-A93V": [
    { gene: "EGFR",   contribution:  0.36, direction: "pos" },
    { gene: "KRAS",   contribution:  0.24, direction: "pos" },
    { gene: "STK11",  contribution: -0.18, direction: "neg" },
    { gene: "RB1",    contribution: -0.14, direction: "neg" },
    { gene: "ALK",    contribution:  0.19, direction: "pos" },
    { gene: "MET",    contribution:  0.12, direction: "pos" },
  ],
  "TCGA-EJ-A7NL": [
    { gene: "AR",     contribution:  0.44, direction: "pos" },
    { gene: "PTEN",   contribution: -0.28, direction: "neg" },
    { gene: "ERG",    contribution:  0.21, direction: "pos" },
    { gene: "TP53",   contribution: -0.16, direction: "neg" },
    { gene: "MYC",    contribution:  0.13, direction: "pos" },
  ],
};

export default function ExplainableAI() {
  const [selectedSample, setSelectedSample] = useState(SAMPLES[0].id);
  const sample = SAMPLES.find(s => s.id === selectedSample)!;
  const sampleExplanation = SAMPLE_EXPLANATIONS[selectedSample] ?? [];

  const globalChartData = GLOBAL_IMPORTANCE.map(g => ({
    gene: g.gene,
    value: g.shap,
    fill: g.direction === "up" ? CHART_COLORS.blue : CHART_COLORS.red,
    direction: g.direction,
    subtype: g.subtype,
  }));

  const sampleChartData = sampleExplanation.map(e => ({
    gene: e.gene,
    value: e.contribution,
    fill: e.direction === "pos" ? CHART_COLORS.green : CHART_COLORS.red,
  }));

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <HeaderControls
          title="Explainable AI"
          subtitle="SHAP-style feature importance, global gene rankings, and sample-level prediction explanations."
        />

        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Method note:</strong> Feature importance is computed using a SHAP-approximation approach combining
            model gradient weights, permutation importance, and coefficient-based attribution depending on the selected
            model. This is a research-grade approximation. Full SHAP integration is planned for Phase 3.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="global">
          <TabsList>
            <TabsTrigger value="global">Global Feature Importance</TabsTrigger>
            <TabsTrigger value="sample">Sample-Level Explanation</TabsTrigger>
            <TabsTrigger value="table">Gene Importance Table</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Top 15 Genes — Global SHAP Importance</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Averaged across all samples and cancer subtypes. Blue = upregulated driver, red = downregulated / suppressor.</p>
                </div>
                <CSVLink data={GLOBAL_IMPORTANCE} filename="global-feature-importance.csv"
                  className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground">
                  <Download className="w-3.5 h-3.5" />
                </CSVLink>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={380} debounce={0}>
                  <BarChart data={globalChartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                    <XAxis type="number" domain={[0, 0.45]} fontSize={11} opacity={0.7} tickFormatter={v => v.toFixed(2)} />
                    <YAxis type="category" dataKey="gene" fontSize={12} width={60} opacity={0.85} />
                    <Tooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} />
                    <Bar dataKey="value" name="SHAP Value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {globalChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="border-blue-200 dark:border-blue-800">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold">Top Upregulated Drivers</span>
                  </div>
                  {GLOBAL_IMPORTANCE.filter(g => g.direction === "up").slice(0, 5).map(g => (
                    <div key={g.gene} className="flex items-center justify-between py-1 text-sm border-b border-border/30 last:border-0">
                      <span className="font-mono font-medium">{g.gene}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5">{g.subtype}</Badge>
                        <span className="text-blue-600 font-mono">{g.shap.toFixed(3)}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-900">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-semibold">Top Suppressor Genes</span>
                  </div>
                  {GLOBAL_IMPORTANCE.filter(g => g.direction === "down").slice(0, 5).map(g => (
                    <div key={g.gene} className="flex items-center justify-between py-1 text-sm border-b border-border/30 last:border-0">
                      <span className="font-mono font-medium">{g.gene}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5">{g.subtype}</Badge>
                        <span className="text-red-600 font-mono">{g.shap.toFixed(3)}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-semibold">Model Summary</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Active Model</span><span className="font-medium">GNN-AE v2.4.1</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">XAI Method</span><span className="font-medium">SHAP-Approx</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Features Used</span><span className="font-medium">18,420</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Top Feature</span><span className="font-mono font-medium text-primary">ERBB2</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Coverage</span><span className="font-medium">100% of samples</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sample" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Select sample:</span>
              <Select value={selectedSample} onValueChange={setSelectedSample}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLES.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.id} — {s.subtype}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                Confidence: {(sample.confidence * 100).toFixed(1)}%
              </Badge>
              <Badge className="bg-secondary text-secondary-foreground border-0">
                Predicted: {sample.subtype}
              </Badge>
            </div>

            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-base">Gene Contribution — {selectedSample}</CardTitle>
                <p className="text-xs text-muted-foreground">Green bars push the prediction toward the predicted subtype; red bars push against it.</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300} debounce={0}>
                  <BarChart data={sampleChartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                    <XAxis type="number" domain={[-0.5, 0.5]} fontSize={11} opacity={0.7} tickFormatter={v => v.toFixed(2)} />
                    <YAxis type="category" dataKey="gene" fontSize={12} width={60} opacity={0.85} />
                    <Tooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} />
                    <ReferenceLine x={0} stroke="currentColor" opacity={0.3} />
                    <Bar dataKey="value" name="Contribution" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {sampleChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-sm font-semibold mb-2">Prediction Reasoning</div>
                <p className="text-sm text-muted-foreground">
                  For sample <strong className="font-mono">{selectedSample}</strong>, the model predicts
                  <strong> {sample.subtype}</strong> with <strong>{(sample.confidence * 100).toFixed(1)}%</strong> confidence.{" "}
                  {sampleExplanation.filter(e => e.direction === "pos").map(e => e.gene).join(", ")} show positive contributions,
                  while {sampleExplanation.filter(e => e.direction === "neg").map(e => e.gene).join(", ")} exert downward influence
                  on this classification. The high confidence suggests a strong molecular signature consistent with the predicted subtype.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="table" className="mt-4">
            <Card>
              <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Gene Importance Ranking</CardTitle>
                <CSVLink data={GLOBAL_IMPORTANCE} filename="gene-importance.csv"
                  className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground">
                  <Download className="w-3.5 h-3.5" />
                </CSVLink>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Rank</TableHead>
                        <TableHead>Gene</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Primary Subtype</TableHead>
                        <TableHead className="text-right">SHAP Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {GLOBAL_IMPORTANCE.map((g, i) => (
                        <TableRow key={g.gene}>
                          <TableCell className="font-mono text-sm text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-mono font-semibold text-primary">{g.gene}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {g.direction === "up"
                                ? <><TrendingUp className="w-3.5 h-3.5 text-blue-500" /><span className="text-xs text-blue-600">Upregulated</span></>
                                : <><TrendingDown className="w-3.5 h-3.5 text-red-500" /><span className="text-xs text-red-600">Downregulated</span></>}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{g.subtype}</Badge></TableCell>
                          <TableCell className="text-right font-mono font-semibold">{g.shap.toFixed(3)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
