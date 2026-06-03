import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { logger } from "../lib/logger";

// ─── ML Integration ───────────────────────────────────────────────────────────

const ML_GENES = [
  "ERBB2","PIK3CA","PTEN","BRAF","KRAS","CTNNB1","BRCA1","BRCA2","EGFR","NRAS",
  "TP53","CCND1","MYC","SRC","PBRM1","AR","ESR1","CDH1","RB1","CDKN2A",
  "VHL","APC","MLH1","SMAD4","FGFR1","FGFR2","FGFR3","ALK","MET","RET",
  "NF1","NF2","NOTCH1","NOTCH2","PDGFRA","KIT","IDH1","IDH2","TERT","CDKN1B",
  "PIK3R1","FOXO3","AKT1","MTOR","ARID1A","SETD2","KDM6A","CREBBP","EP300","DNMT3A",
];

function seededRandom(seed: string): () => number {
  let s = [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0x7fffffff, 1);
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function buildGeneExpressionCsv(sampleId: string): string {
  const rand = seededRandom(sampleId);
  const values = ML_GENES.map(() => (rand() * 6 - 2).toFixed(4));
  const header = ["sampleId", ...ML_GENES].join(",");
  const row = [sampleId, ...values].join(",");
  return `${header}\n${row}\n`;
}

async function runMlPrediction(analysis: Record<string, unknown>): Promise<void> {
  const start = Date.now();
  const sampleId = analysis.sampleId as string;
  try {
    const csv = buildGeneExpressionCsv(sampleId);
    const blob = new Blob([csv], { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", blob, `${sampleId}.csv`);

    const response = await fetch("http://localhost:8000/ml/predict", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(`ML service returned ${response.status}`);

    const result = await response.json() as { predictions?: Array<{
      predictedSubtype: string; confidenceScore: number; genesMatched: number;
      subtypeProbabilities: Record<string, number>;
    }> };
    const pred = result.predictions?.[0];
    if (!pred) throw new Error("No predictions returned from ML service");

    analysis.status = "completed";
    analysis.cancerSubtype = pred.predictedSubtype;
    analysis.confidenceScore = pred.confidenceScore;
    analysis.processingTimeMs = Date.now() - start;
    analysis.completedAt = new Date().toISOString();
    analysis.geneCount = pred.genesMatched;
    analysis.subtypeProbabilities = pred.subtypeProbabilities; // store full probability map
    logger.info({ sampleId, subtype: pred.predictedSubtype, confidence: pred.confidenceScore }, "ML prediction completed");
  } catch (err) {
    logger.error({ err, sampleId }, "ML prediction failed");
    analysis.status = "failed";
  }
}

const router: IRouter = Router();

// ─── Master Data ─────────────────────────────────────────────────────────────

const CANCER_SUBTYPES = [
  { name: "BRCA (Breast)",      count: 42, percentage: 28.0, color: "#ec4899", fiveYearSurvival: 0.91, medianAge: 59 },
  { name: "LUAD (Lung Adeno)",  count: 35, percentage: 23.3, color: "#0079F2", fiveYearSurvival: 0.25, medianAge: 67 },
  { name: "COAD (Colon)",       count: 28, percentage: 18.7, color: "#009118", fiveYearSurvival: 0.64, medianAge: 67 },
  { name: "GBM (Glioblastoma)", count: 24, percentage: 16.0, color: "#795EFF", fiveYearSurvival: 0.07, medianAge: 64 },
  { name: "PRAD (Prostate)",    count: 21, percentage: 14.0, color: "#f59e0b", fiveYearSurvival: 0.98, medianAge: 66 },
];

const ANALYSES = [
  { id: 1,  sampleId: "TCGA-A7-A0CE", dataSource: "TCGA Pan-Cancer Atlas",     status: "completed", cancerSubtype: "BRCA (Breast)",      confidenceScore: 0.947, processingTimeMs: 3421, createdAt: "2026-05-10T10:23:00Z", completedAt: "2026-05-10T10:23:03Z", patientAge: 52, patientGender: "F", tissueType: "Invasive Ductal Carcinoma", stage: "II",  geneCount: 20531 },
  { id: 2,  sampleId: "TCGA-55-6543", dataSource: "GEO Gene Expression Omnibus", status: "completed", cancerSubtype: "LUAD (Lung Adeno)", confidenceScore: 0.912, processingTimeMs: 2870, createdAt: "2026-05-11T11:05:00Z", completedAt: "2026-05-11T11:05:03Z", patientAge: 68, patientGender: "M", tissueType: "Adenocarcinoma",          stage: "III", geneCount: 20531 },
  { id: 3,  sampleId: "TCGA-AA-3662", dataSource: "TCGA Pan-Cancer Atlas",     status: "completed", cancerSubtype: "COAD (Colon)",       confidenceScore: 0.883, processingTimeMs: 3102, createdAt: "2026-05-13T09:14:00Z", completedAt: "2026-05-13T09:14:03Z", patientAge: 71, patientGender: "M", tissueType: "Adenocarcinoma",          stage: "III", geneCount: 20531 },
  { id: 4,  sampleId: "TCGA-02-0001", dataSource: "GDC Data Portal",           status: "completed", cancerSubtype: "GBM (Glioblastoma)", confidenceScore: 0.971, processingTimeMs: 2955, createdAt: "2026-05-14T13:30:00Z", completedAt: "2026-05-14T13:30:03Z", patientAge: 61, patientGender: "M", tissueType: "Glioblastoma",            stage: "IV",  geneCount: 20531 },
  { id: 5,  sampleId: "TCGA-CH-5741", dataSource: "TCGA Pan-Cancer Atlas",     status: "completed", cancerSubtype: "PRAD (Prostate)",    confidenceScore: 0.859, processingTimeMs: 3210, createdAt: "2026-05-15T08:45:00Z", completedAt: "2026-05-15T08:45:03Z", patientAge: 64, patientGender: "M", tissueType: "Adenocarcinoma",          stage: "I",   geneCount: 20531 },
  { id: 6,  sampleId: "TCGA-OL-A66J", dataSource: "GEO Gene Expression Omnibus", status: "completed", cancerSubtype: "BRCA (Breast)",    confidenceScore: 0.934, processingTimeMs: 3321, createdAt: "2026-05-16T10:00:00Z", completedAt: "2026-05-16T10:00:03Z", patientAge: 48, patientGender: "F", tissueType: "Triple Negative",         stage: "II",  geneCount: 20531 },
  { id: 7,  sampleId: "TCGA-4B-A93V", dataSource: "NCBI GEO",                  status: "completed", cancerSubtype: "LUAD (Lung Adeno)", confidenceScore: 0.901, processingTimeMs: 2900, createdAt: "2026-05-17T11:20:00Z", completedAt: "2026-05-17T11:20:03Z", patientAge: 73, patientGender: "F", tissueType: "Squamous Cell",          stage: "II",  geneCount: 20531 },
  { id: 8,  sampleId: "TCGA-D5-6930", dataSource: "GDC Data Portal",           status: "completed", cancerSubtype: "COAD (Colon)",       confidenceScore: 0.919, processingTimeMs: 2780, createdAt: "2026-05-18T14:00:00Z", completedAt: "2026-05-18T14:00:03Z", patientAge: 58, patientGender: "F", tissueType: "Signet Ring",            stage: "IV",  geneCount: 20531 },
  { id: 9,  sampleId: "TCGA-HT-7693", dataSource: "TCGA Pan-Cancer Atlas",     status: "completed", cancerSubtype: "GBM (Glioblastoma)", confidenceScore: 0.963, processingTimeMs: 3010, createdAt: "2026-05-19T09:00:00Z", completedAt: "2026-05-19T09:00:03Z", patientAge: 55, patientGender: "M", tissueType: "IDH-mutant",             stage: "IV",  geneCount: 20531 },
  { id: 10, sampleId: "TCGA-EJ-A7NL", dataSource: "TCGA Pan-Cancer Atlas",     status: "completed", cancerSubtype: "PRAD (Prostate)",    confidenceScore: 0.877, processingTimeMs: 3180, createdAt: "2026-05-20T10:30:00Z", completedAt: "2026-05-20T10:30:03Z", patientAge: 62, patientGender: "M", tissueType: "Gleason 7",              stage: "II",  geneCount: 20531 },
  { id: 11, sampleId: "TCGA-BH-A0B3", dataSource: "GEO Gene Expression Omnibus", status: "processing", cancerSubtype: null, confidenceScore: null, processingTimeMs: null, createdAt: "2026-05-22T09:10:00Z", completedAt: null, patientAge: 54, patientGender: "F", tissueType: "IDC", stage: null, geneCount: null },
  { id: 12, sampleId: "TCGA-E2-A14P", dataSource: "GDC Data Portal",           status: "pending",    cancerSubtype: null, confidenceScore: null, processingTimeMs: null, createdAt: "2026-05-22T09:30:00Z", completedAt: null, patientAge: 66, patientGender: "M", tissueType: "Unknown", stage: null, geneCount: null },
];

const BIOMARKERS = [
  { geneId: "ENSG00000141736", geneName: "ERBB2",   expressionLevel: 8.42,  significance: 0.0001, cancerSubtype: "BRCA (Breast)",      chromosome: "17q12",    function: "Receptor tyrosine kinase; HER2 amplification driver" },
  { geneId: "ENSG00000121879", geneName: "PIK3CA",  expressionLevel: 6.81,  significance: 0.0003, cancerSubtype: "BRCA (Breast)",      chromosome: "3q26.32",  function: "PI3K catalytic subunit; activates AKT/mTOR pathway" },
  { geneId: "ENSG00000171862", geneName: "PTEN",    expressionLevel: -4.23, significance: 0.0008, cancerSubtype: "GBM (Glioblastoma)", chromosome: "10q23.31", function: "Phosphatase and tensin homolog; tumour suppressor" },
  { geneId: "ENSG00000157764", geneName: "BRAF",    expressionLevel: 5.67,  significance: 0.0012, cancerSubtype: "COAD (Colon)",       chromosome: "7q34",     function: "Serine/threonine kinase; MAPK/ERK pathway activation" },
  { geneId: "ENSG00000133703", geneName: "KRAS",    expressionLevel: 7.11,  significance: 0.0005, cancerSubtype: "LUAD (Lung Adeno)",  chromosome: "12p12.1",  function: "GTPase; mediates cell proliferation and survival" },
  { geneId: "ENSG00000168036", geneName: "CTNNB1",  expressionLevel: 4.95,  significance: 0.0021, cancerSubtype: "COAD (Colon)",       chromosome: "3p22.1",   function: "Wnt/β-catenin pathway transcriptional activator" },
  { geneId: "ENSG00000012048", geneName: "BRCA1",   expressionLevel: -6.34, significance: 0.0002, cancerSubtype: "BRCA (Breast)",      chromosome: "17q21.31", function: "DNA damage repair; BRCA1/2 mutation in hereditary breast cancer" },
  { geneId: "ENSG00000139618", geneName: "BRCA2",   expressionLevel: -5.88, significance: 0.0004, cancerSubtype: "BRCA (Breast)",      chromosome: "13q12.3",  function: "Homologous recombination repair; tumour suppressor" },
  { geneId: "ENSG00000146648", geneName: "EGFR",    expressionLevel: 9.12,  significance: 0.0001, cancerSubtype: "LUAD (Lung Adeno)",  chromosome: "7p11.2",   function: "EGF receptor; drives cell proliferation in NSCLC" },
  { geneId: "ENSG00000213281", geneName: "NRAS",    expressionLevel: 3.74,  significance: 0.0031, cancerSubtype: "GBM (Glioblastoma)", chromosome: "1p13.2",   function: "GTPase; RAS/MAPK signaling activation" },
  { geneId: "ENSG00000141510", geneName: "TP53",    expressionLevel: -7.21, significance: 0.0001, cancerSubtype: "LUAD (Lung Adeno)",  chromosome: "17p13.1",  function: "Master tumour suppressor; cell cycle regulation" },
  { geneId: "ENSG00000105173", geneName: "CCND1",   expressionLevel: 5.43,  significance: 0.0015, cancerSubtype: "BRCA (Breast)",      chromosome: "11q13.3",  function: "Cyclin D1; CDK4/6 activator in cell cycle" },
  { geneId: "ENSG00000136997", geneName: "MYC",     expressionLevel: 6.77,  significance: 0.0007, cancerSubtype: "COAD (Colon)",       chromosome: "8q24.21",  function: "Proto-oncogene; transcription factor for cell growth" },
  { geneId: "ENSG00000197122", geneName: "SRC",     expressionLevel: 4.12,  significance: 0.0038, cancerSubtype: "BRCA (Breast)",      chromosome: "20q11.23", function: "Non-receptor tyrosine kinase; invasion and metastasis" },
  { geneId: "ENSG00000163939", geneName: "PBRM1",   expressionLevel: -3.85, significance: 0.0044, cancerSubtype: "GBM (Glioblastoma)", chromosome: "3p21.1",   function: "SWI/SNF chromatin remodeling; tumour suppressor" },
];

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/dashboard/summary", async (_req: Request, res: Response): Promise<void> => {
  const completed = ANALYSES.filter(a => a.status === "completed");
  const pending = ANALYSES.filter(a => a.status !== "completed").length;

  const weeklyTrend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date("2026-05-22");
    d.setDate(d.getDate() - (11 - i) * 3);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      analyses: Math.floor(Math.random() * 8 + 3),
      accuracy: +(0.88 + Math.random() * 0.08).toFixed(3),
    };
  });

  res.json({
    totalAnalyses: ANALYSES.length,
    completedAnalyses: completed.length,
    pendingAnalyses: pending,
    overallAccuracy: 0.924,
    totalBiomarkersFound: BIOMARKERS.length,
    totalSamples: 150,
    avgProcessingTimeMs: 3046,
    recentAnalyses: [...ANALYSES].reverse().slice(0, 6),
    subtypeDistribution: CANCER_SUBTYPES,
    weeklyTrend,
    systemHealth: {
      modelVersion: "GNN-AE v2.4.1",
      gpuUtilization: 0.67,
      memoryUsage: 0.54,
      uptime: "14d 7h 32m",
      lastModelUpdate: "2026-05-18T00:00:00Z",
    },
  });
});

router.get("/analyses", async (_req: Request, res: Response): Promise<void> => {
  res.json(ANALYSES);
});

router.post("/analyses", async (req: Request, res: Response): Promise<void> => {
  const { sampleId, dataSource, patientAge, patientGender, tissueType, stage } = req.body;
  if (!sampleId || !dataSource) { res.status(400).json({ error: "sampleId and dataSource are required" }); return; }
  const newAnalysis: Record<string, unknown> = {
    id: ANALYSES.length + 1, sampleId, dataSource, status: "processing",
    cancerSubtype: null, confidenceScore: null, processingTimeMs: null,
    createdAt: new Date().toISOString(), completedAt: null,
    patientAge: patientAge ?? null, patientGender: patientGender ?? null,
    tissueType: tissueType ?? null, stage: stage ?? null, geneCount: null,
  };
  ANALYSES.push(newAnalysis as never);
  res.status(201).json(newAnalysis);
  // Fire-and-forget: run real ML prediction in background, mutate record in-place
  runMlPrediction(newAnalysis).catch(() => { /* already logged inside */ });
});

router.get("/analyses/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const analysis = ANALYSES.find(a => a.id === id);
  if (!analysis) { res.status(404).json({ error: "Analysis not found" }); return; }
  res.json(analysis);
});

router.get("/analyses/:id/results", async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const analysis = ANALYSES.find(a => a.id === id);
  if (!analysis || analysis.status !== "completed") { res.status(404).json({ error: "Results not found" }); return; }
  const topBiomarkers = BIOMARKERS.filter(b => b.cancerSubtype === analysis.cancerSubtype).slice(0, 5);
  const treatmentMap: Record<string, string[]> = {
    "BRCA (Breast)":      ["Trastuzumab (HER2+)", "Palbociclib + Letrozole (HR+)", "Pembrolizumab (TNBC)", "PARP inhibitors (BRCA1/2 mut)"],
    "LUAD (Lung Adeno)":  ["Osimertinib (EGFR mut)", "Alectinib (ALK+)", "Pembrolizumab + Chemo", "Bevacizumab + Erlotinib"],
    "COAD (Colon)":       ["FOLFOX + Bevacizumab", "Cetuximab (KRAS WT)", "Pembrolizumab (MSI-H)", "FOLFIRI + Aflibercept"],
    "GBM (Glioblastoma)": ["Temozolomide + Radiotherapy", "Bevacizumab", "TTFields (Optune)", "Lomustine salvage"],
    "PRAD (Prostate)":    ["Enzalutamide", "Abiraterone + Prednisone", "Docetaxel", "Radium-223 (bone mets)"],
  };
  const sigMap: Record<string, string[]> = {
    "BRCA (Breast)":      ["Luminal A", "HER2-enriched", "Basal-like", "BRCA1/2 mutation"],
    "LUAD (Lung Adeno)":  ["EGFR exon 19 del", "ALK fusion", "ROS1 rearrangement", "KRAS G12C"],
    "COAD (Colon)":       ["MSI-H", "CMS2", "RAS WT", "POLE mutation"],
    "GBM (Glioblastoma)": ["IDH-wildtype", "MGMT methylated", "EGFR amplified", "TERT promoter mut"],
    "PRAD (Prostate)":    ["AR signaling", "PTEN loss", "ETS fusion", "CDK12 mutation"],
  };
  res.json({
    analysisId: id,
    predictedSubtype: analysis.cancerSubtype,
    confidenceScore: analysis.confidenceScore,
    topBiomarkers,
    treatmentPathways: treatmentMap[analysis.cancerSubtype!] ?? [],
    subtypeProbabilities: (() => {
      // Use real ML probabilities if stored; fall back to mock for legacy records
      const stored = analysis.subtypeProbabilities as Record<string, number> | undefined;
      if (stored) {
        return Object.entries(stored).map(([subtype, probability]) => ({ subtype, probability }))
          .sort((a, b) => b.probability - a.probability);
      }
      return CANCER_SUBTYPES.map((s, i) => ({
        subtype: s.name,
        probability: s.name === analysis.cancerSubtype
          ? (analysis.confidenceScore ?? 0.9)
          : +((1 - (analysis.confidenceScore ?? 0.9)) * [0.4, 0.25, 0.18, 0.1, 0.07][i] * 5).toFixed(3),
      }));
    })(),
    molecularSignature: sigMap[analysis.cancerSubtype!] ?? [],
    clinicalNotes: `Sample ${analysis.sampleId} classified as ${analysis.cancerSubtype} with high confidence (${((analysis.confidenceScore ?? 0) * 100).toFixed(1)}%). Stage ${analysis.stage ?? "unknown"} with ${analysis.tissueType ?? "unknown"} histology. Molecular profiling identifies key actionable targets. Treatment selection should be guided by tumor board review and patient clinical context.`,
  });
});

router.get("/metrics/model-performance", async (_req: Request, res: Response): Promise<void> => {
  res.json({
    overallAccuracy: 0.924, overallPrecision: 0.917, overallRecall: 0.911, overallF1Score: 0.914, aucRoc: 0.978,
    perSubtypeMetrics: [
      { subtype: "BRCA",  accuracy: 0.947, precision: 0.938, recall: 0.952, f1Score: 0.945, support: 87, aucRoc: 0.991 },
      { subtype: "LUAD",  accuracy: 0.912, precision: 0.904, recall: 0.918, f1Score: 0.911, support: 73, aucRoc: 0.974 },
      { subtype: "COAD",  accuracy: 0.931, precision: 0.925, recall: 0.928, f1Score: 0.926, support: 61, aucRoc: 0.983 },
      { subtype: "GBM",   accuracy: 0.963, precision: 0.958, recall: 0.961, f1Score: 0.959, support: 54, aucRoc: 0.992 },
      { subtype: "PRAD",  accuracy: 0.887, precision: 0.879, recall: 0.882, f1Score: 0.880, support: 48, aucRoc: 0.961 },
    ],
    trainingHistory: Array.from({ length: 100 }, (_, i) => ({
      epoch: i + 1,
      trainLoss:     +Math.max(0.06, 1.8  * Math.exp(-0.09  * (i + 1)) + (Math.sin(i * 0.3) * 0.02)).toFixed(4),
      valLoss:       +Math.max(0.09, 1.95 * Math.exp(-0.085 * (i + 1)) + (Math.sin(i * 0.4) * 0.03)).toFixed(4),
      trainAccuracy: +Math.min(0.985, 0.45 + 0.54 * (1 - Math.exp(-0.08  * (i + 1))) + Math.sin(i * 0.3) * 0.005).toFixed(4),
      valAccuracy:   +Math.min(0.965, 0.43 + 0.52 * (1 - Math.exp(-0.075 * (i + 1))) + Math.sin(i * 0.4) * 0.006).toFixed(4),
    })),
  });
});

router.get("/metrics/confusion-matrix", async (_req: Request, res: Response): Promise<void> => {
  res.json({
    labels: ["BRCA", "LUAD", "COAD", "GBM", "PRAD"],
    matrix: [[83,1,1,1,1],[2,67,2,1,1],[1,1,57,1,1],[0,1,0,52,1],[2,1,2,1,42]],
  });
});

router.get("/metrics/roc-curves", async (_req: Request, res: Response): Promise<void> => {
  const subtypes = ["BRCA", "LUAD", "COAD", "GBM", "PRAD"];
  const aucs = [0.991, 0.974, 0.983, 0.992, 0.961];
  const curves = subtypes.map((subtype, si) => {
    const auc = aucs[si];
    const pts: { fpr: number; tpr: number }[] = [{ fpr: 0, tpr: 0 }];
    for (let i = 1; i <= 49; i++) {
      const fpr = i / 50;
      const tpr = Math.min(1, Math.pow(fpr, (1 - auc) / auc) * (1 + (Math.random() - 0.5) * 0.02));
      pts.push({ fpr: +fpr.toFixed(3), tpr: +tpr.toFixed(3) });
    }
    pts.push({ fpr: 1, tpr: 1 });
    return { subtype, auc, points: pts };
  });
  res.json(curves);
});

router.get("/metrics/pr-curves", async (_req: Request, res: Response): Promise<void> => {
  const subtypes = ["BRCA", "LUAD", "COAD", "GBM", "PRAD"];
  const aps = [0.982, 0.963, 0.971, 0.988, 0.954];
  const curves = subtypes.map((subtype, si) => {
    const ap = aps[si];
    const pts: { recall: number; precision: number }[] = [];
    for (let i = 0; i <= 50; i++) {
      const recall = i / 50;
      const precision = Math.max(0.1, ap * (1 - recall * 0.3) + (Math.random() - 0.5) * 0.02);
      pts.push({ recall: +recall.toFixed(3), precision: +Math.min(1, precision).toFixed(3) });
    }
    return { subtype, ap, points: pts };
  });
  res.json(curves);
});

router.get("/biomarkers", async (_req: Request, res: Response): Promise<void> => {
  res.json(BIOMARKERS);
});

router.get("/cancer-subtypes", async (_req: Request, res: Response): Promise<void> => {
  res.json(CANCER_SUBTYPES);
});

// ─── Genomics ─────────────────────────────────────────────────────────────────

const TOP_GENES = ["ERBB2","PIK3CA","TP53","KRAS","EGFR","PTEN","BRCA1","BRCA2","MYC","CCND1","BRAF","CTNNB1","SRC","NRAS","PBRM1","CDH1","RB1","APC","VHL","IDH1"];
const SAMPLE_IDS = ANALYSES.filter(a => a.status === "completed").map(a => a.sampleId);

router.get("/genomics/heatmap", async (_req: Request, res: Response): Promise<void> => {
  const sampleSubtypeMap: Record<string, string> = {};
  ANALYSES.forEach(a => { if (a.cancerSubtype) sampleSubtypeMap[a.sampleId] = a.cancerSubtype; });
  const values = TOP_GENES.map(gene =>
    SAMPLE_IDS.map(sample => {
      const subtype = sampleSubtypeMap[sample] ?? "";
      const base = (gene === "ERBB2" && subtype.includes("BRCA")) ? 3.5 :
                   (gene === "KRAS"  && subtype.includes("LUAD")) ? 2.8 :
                   (gene === "EGFR"  && subtype.includes("LUAD")) ? 3.9 :
                   (gene === "TP53"  && !subtype.includes("PRAD")) ? -2.1 :
                   (gene === "PTEN"  && subtype.includes("GBM"))  ? -3.2 :
                   (Math.random() - 0.5) * 2;
      return +( base + (Math.random() - 0.5) * 0.8).toFixed(3);
    })
  );
  res.json({ genes: TOP_GENES, samples: SAMPLE_IDS, values, subtypes: SAMPLE_IDS.map(s => sampleSubtypeMap[s] ?? "Unknown") });
});

router.get("/genomics/pca", async (_req: Request, res: Response): Promise<void> => {
  const subtypeOffsets: Record<string, [number, number]> = {
    "BRCA (Breast)": [-25, 15], "LUAD (Lung Adeno)": [20, -20], "COAD (Colon)": [10, 25],
    "GBM (Glioblastoma)": [-15, -25], "PRAD (Prostate)": [30, 10],
  };
  const points = ANALYSES.filter(a => a.status === "completed").map(a => {
    const [ox, oy] = subtypeOffsets[a.cancerSubtype!] ?? [0, 0];
    return {
      sampleId: a.sampleId, subtype: a.cancerSubtype!,
      pc1: +(ox + (Math.random() - 0.5) * 18).toFixed(3),
      pc2: +(oy + (Math.random() - 0.5) * 18).toFixed(3),
      pc3: +((Math.random() - 0.5) * 15).toFixed(3),
    };
  });
  res.json({ points, varianceExplained: [0.342, 0.218, 0.134, 0.089, 0.072] });
});

router.get("/genomics/volcano", async (_req: Request, res: Response): Promise<void> => {
  const geneNames = ["ERBB2","KRAS","EGFR","TP53","PTEN","MYC","CCND1","BRCA1","BRCA2","BRAF","PIK3CA","CTNNB1","SRC","NRAS","CDH1","RB1","APC","VHL","IDH1","VEGFA","PDCD1","CD274","FGFR1","ALK","RET","MET","NOTCH1","JAK2","STAT3","MDM2","BCL2","MTOR","AKT1","RAF1","MAP2K1","CDKN2A","CDKN1A","CDK4","CDK6","AURKB","FOXO3","SMAD4","TGFBR2","WWTR1","YAP1","SOX2","OCT4","NANOG","KLF4","ZEB1"];
  const highSig = ["ERBB2","KRAS","EGFR","TP53","PTEN","MYC","CCND1","BRCA1","BRCA2","BRAF","PIK3CA"];
  const points = geneNames.map(gene => {
    const sig = highSig.includes(gene);
    const log2FC = sig ? (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 3.5) : (Math.random() - 0.5) * 2.5;
    const pval = sig ? Math.random() * 0.0001 : Math.random() * 0.3 + 0.01;
    return { geneName: gene, log2FoldChange: +log2FC.toFixed(3), negLog10Pval: +(-Math.log10(pval)).toFixed(3), significant: sig, upregulated: log2FC > 0 };
  });
  res.json({ points, thresholdFc: 1.5, thresholdPval: 2 });
});

router.get("/genomics/umap", async (_req: Request, res: Response): Promise<void> => {
  const clusterCenters: Record<string, [number, number]> = {
    "BRCA (Breast)": [3, 7], "LUAD (Lung Adeno)": [-6, -3], "COAD (Colon)": [7, -5],
    "GBM (Glioblastoma)": [-4, 6], "PRAD (Prostate)": [1, -8],
  };
  const subtypeToCluster: Record<string, number> = {
    "BRCA (Breast)": 0, "LUAD (Lung Adeno)": 1, "COAD (Colon)": 2, "GBM (Glioblastoma)": 3, "PRAD (Prostate)": 4,
  };
  const points = ANALYSES.filter(a => a.status === "completed").map(a => {
    const [cx, cy] = clusterCenters[a.cancerSubtype!] ?? [0, 0];
    return {
      sampleId: a.sampleId, subtype: a.cancerSubtype!, cluster: subtypeToCluster[a.cancerSubtype!] ?? 0,
      x: +(cx + (Math.random() - 0.5) * 4).toFixed(3),
      y: +(cy + (Math.random() - 0.5) * 4).toFixed(3),
    };
  });
  res.json({ points });
});

router.get("/network/ppi", async (_req: Request, res: Response): Promise<void> => {
  const nodes = [
    { id: "TP53",   label: "TP53",   cancerRelevance: "tumor_suppressor", degree: 12, expressionLevel: -7.21 },
    { id: "ERBB2",  label: "ERBB2",  cancerRelevance: "oncogene",         degree: 9,  expressionLevel: 8.42  },
    { id: "EGFR",   label: "EGFR",   cancerRelevance: "oncogene",         degree: 11, expressionLevel: 9.12  },
    { id: "KRAS",   label: "KRAS",   cancerRelevance: "oncogene",         degree: 8,  expressionLevel: 7.11  },
    { id: "PIK3CA", label: "PIK3CA", cancerRelevance: "oncogene",         degree: 7,  expressionLevel: 6.81  },
    { id: "PTEN",   label: "PTEN",   cancerRelevance: "tumor_suppressor", degree: 6,  expressionLevel: -4.23 },
    { id: "MYC",    label: "MYC",    cancerRelevance: "oncogene",         degree: 10, expressionLevel: 6.77  },
    { id: "BRCA1",  label: "BRCA1",  cancerRelevance: "tumor_suppressor", degree: 5,  expressionLevel: -6.34 },
    { id: "AKT1",   label: "AKT1",   cancerRelevance: "oncogene",         degree: 8,  expressionLevel: 4.55  },
    { id: "MDM2",   label: "MDM2",   cancerRelevance: "oncogene",         degree: 6,  expressionLevel: 3.21  },
    { id: "CDK4",   label: "CDK4",   cancerRelevance: "oncogene",         degree: 5,  expressionLevel: 3.88  },
    { id: "BRAF",   label: "BRAF",   cancerRelevance: "oncogene",         degree: 7,  expressionLevel: 5.67  },
  ];
  const edges = [
    { source: "EGFR",   target: "KRAS",   weight: 0.92, interactionType: "activation" },
    { source: "KRAS",   target: "BRAF",   weight: 0.88, interactionType: "activation" },
    { source: "EGFR",   target: "PIK3CA", weight: 0.79, interactionType: "activation" },
    { source: "PIK3CA", target: "AKT1",   weight: 0.95, interactionType: "activation" },
    { source: "AKT1",   target: "MDM2",   weight: 0.71, interactionType: "activation" },
    { source: "MDM2",   target: "TP53",   weight: 0.89, interactionType: "inhibition" },
    { source: "TP53",   target: "BRCA1",  weight: 0.67, interactionType: "activation" },
    { source: "ERBB2",  target: "EGFR",   weight: 0.84, interactionType: "binding"    },
    { source: "ERBB2",  target: "PIK3CA", weight: 0.76, interactionType: "activation" },
    { source: "PTEN",   target: "AKT1",   weight: 0.91, interactionType: "inhibition" },
    { source: "MYC",    target: "CDK4",   weight: 0.73, interactionType: "activation" },
    { source: "TP53",   target: "CDK4",   weight: 0.82, interactionType: "inhibition" },
    { source: "KRAS",   target: "MYC",    weight: 0.68, interactionType: "activation" },
  ];
  res.json({ nodes, edges });
});

// ─── Survival ─────────────────────────────────────────────────────────────────

router.get("/survival/kaplan-meier", async (_req: Request, res: Response): Promise<void> => {
  const params = [
    { subtype: "BRCA (Breast)",      color: "#ec4899", lambda: 0.007, n: 87 },
    { subtype: "LUAD (Lung Adeno)",  color: "#0079F2", lambda: 0.035, n: 73 },
    { subtype: "COAD (Colon)",       color: "#009118", lambda: 0.015, n: 61 },
    { subtype: "GBM (Glioblastoma)", color: "#795EFF", lambda: 0.085, n: 54 },
    { subtype: "PRAD (Prostate)",    color: "#f59e0b", lambda: 0.003, n: 48 },
  ];
  const curves = params.map(({ subtype, color, lambda, n }) => {
    const points = [];
    let survival = 1.0, atRisk = n;
    for (let t = 0; t <= 120; t += 6) {
      survival = Math.max(0, Math.exp(-lambda * t) * (1 + (Math.random() - 0.5) * 0.02));
      atRisk = Math.round(n * survival);
      points.push({ time: t, survival: +survival.toFixed(4), atRisk });
    }
    return { subtype, color, points };
  });
  const medianSurvival = [
    { subtype: "BRCA (Breast)",      months: 98.4, lower95: 88.2, upper95: 112.1 },
    { subtype: "LUAD (Lung Adeno)",  months: 19.8, lower95: 16.4, upper95: 24.3  },
    { subtype: "COAD (Colon)",       months: 46.2, lower95: 38.7, upper95: 56.8  },
    { subtype: "GBM (Glioblastoma)", months: 8.1,  lower95: 6.4,  upper95: 10.4  },
    { subtype: "PRAD (Prostate)",    months: 231.0, lower95: 198.0, upper95: 270.0 },
  ];
  res.json({ curves, medianSurvival });
});

// ─── Drugs ────────────────────────────────────────────────────────────────────

router.get("/drugs/sensitivity", async (_req: Request, res: Response): Promise<void> => {
  res.json([
    { drugName: "Trastuzumab",   cancerSubtype: "BRCA (Breast)",      sensitivityScore: 0.91, resistanceScore: 0.09, evidence: "high",   mechanism: "HER2 targeted monoclonal antibody",    fdaApproved: true,  clinicalTrials: 48 },
    { drugName: "Osimertinib",   cancerSubtype: "LUAD (Lung Adeno)",  sensitivityScore: 0.88, resistanceScore: 0.12, evidence: "high",   mechanism: "EGFR T790M inhibitor",                 fdaApproved: true,  clinicalTrials: 37 },
    { drugName: "Bevacizumab",   cancerSubtype: "GBM (Glioblastoma)", sensitivityScore: 0.61, resistanceScore: 0.39, evidence: "medium", mechanism: "VEGF-A neutralizing antibody",          fdaApproved: true,  clinicalTrials: 29 },
    { drugName: "Cetuximab",     cancerSubtype: "COAD (Colon)",       sensitivityScore: 0.74, resistanceScore: 0.26, evidence: "high",   mechanism: "EGFR antagonist (KRAS WT only)",       fdaApproved: true,  clinicalTrials: 31 },
    { drugName: "Enzalutamide",  cancerSubtype: "PRAD (Prostate)",    sensitivityScore: 0.84, resistanceScore: 0.16, evidence: "high",   mechanism: "Androgen receptor signaling inhibitor", fdaApproved: true,  clinicalTrials: 22 },
    { drugName: "Palbociclib",   cancerSubtype: "BRCA (Breast)",      sensitivityScore: 0.79, resistanceScore: 0.21, evidence: "high",   mechanism: "CDK4/6 inhibitor",                     fdaApproved: true,  clinicalTrials: 41 },
    { drugName: "Pembrolizumab", cancerSubtype: "LUAD (Lung Adeno)",  sensitivityScore: 0.72, resistanceScore: 0.28, evidence: "high",   mechanism: "PD-1 checkpoint inhibitor",            fdaApproved: true,  clinicalTrials: 55 },
    { drugName: "Temozolomide",  cancerSubtype: "GBM (Glioblastoma)", sensitivityScore: 0.55, resistanceScore: 0.45, evidence: "high",   mechanism: "Alkylating agent (DNA damage)",        fdaApproved: true,  clinicalTrials: 18 },
    { drugName: "Olaparib",      cancerSubtype: "BRCA (Breast)",      sensitivityScore: 0.85, resistanceScore: 0.15, evidence: "high",   mechanism: "PARP inhibitor (BRCA1/2 mut)",         fdaApproved: true,  clinicalTrials: 33 },
    { drugName: "Vemurafenib",   cancerSubtype: "COAD (Colon)",       sensitivityScore: 0.58, resistanceScore: 0.42, evidence: "medium", mechanism: "BRAF V600E inhibitor",                 fdaApproved: false, clinicalTrials: 14 },
  ]);
});

router.get("/drugs/recommendations/:subtypeId", async (req: Request, res: Response): Promise<void> => {
  const subtypeId = Array.isArray(req.params.subtypeId) ? req.params.subtypeId[0] : req.params.subtypeId;
  const recos: Record<string, any[]> = {
    brca: [
      { rank: 1, drugName: "Trastuzumab + Pertuzumab", targetGene: "ERBB2", sensitivityScore: 0.91, evidence: "FDA-approved (HER2+)", mechanism: "Dual HER2 blockade", sideEffects: ["Cardiotoxicity","Diarrhea","Fatigue"], combinationTherapy: ["Docetaxel","Carboplatin"], fdaApproved: true, phase: "Standard of Care" },
      { rank: 2, drugName: "Olaparib",                  targetGene: "BRCA1/2", sensitivityScore: 0.85, evidence: "FDA-approved (BRCA mut)", mechanism: "PARP inhibition → synthetic lethality", sideEffects: ["Anaemia","Nausea","Fatigue"], combinationTherapy: ["Bevacizumab"], fdaApproved: true, phase: "Standard of Care" },
      { rank: 3, drugName: "Palbociclib + Letrozole",   targetGene: "CDK4/6", sensitivityScore: 0.79, evidence: "FDA-approved (HR+)", mechanism: "CDK4/6 cell cycle arrest", sideEffects: ["Neutropenia","Fatigue","Alopecia"], combinationTherapy: ["Fulvestrant"], fdaApproved: true, phase: "Standard of Care" },
    ],
    luad: [
      { rank: 1, drugName: "Osimertinib", targetGene: "EGFR", sensitivityScore: 0.88, evidence: "FDA-approved (EGFR mut)", mechanism: "3rd gen EGFR T790M inhibitor", sideEffects: ["Rash","Diarrhea","ILD"], combinationTherapy: [], fdaApproved: true, phase: "Standard of Care" },
      { rank: 2, drugName: "Pembrolizumab", targetGene: "PD-L1", sensitivityScore: 0.72, evidence: "FDA-approved (PD-L1≥50%)", mechanism: "Anti-PD-1 checkpoint inhibition", sideEffects: ["Immune-related AEs","Fatigue"], combinationTherapy: ["Pemetrexed","Carboplatin"], fdaApproved: true, phase: "Standard of Care" },
    ],
  };
  const key = subtypeId.toLowerCase().replace(/[^a-z]/g, "");
  res.json(recos[key] ?? recos["brca"]);
});

// ─── Genes ────────────────────────────────────────────────────────────────────

const GENE_DB = [
  { geneId: "ENSG00000141736", geneName: "ERBB2",  chromosome: "17q12",    cancerRelevance: "oncogene",         description: "Receptor tyrosine-protein kinase erbB-2", expressionMean: 4.21, mutationFrequency: 0.18 },
  { geneId: "ENSG00000133703", geneName: "KRAS",   chromosome: "12p12.1",  cancerRelevance: "oncogene",         description: "KRAS proto-oncogene, GTPase",             expressionMean: 5.44, mutationFrequency: 0.32 },
  { geneId: "ENSG00000146648", geneName: "EGFR",   chromosome: "7p11.2",   cancerRelevance: "oncogene",         description: "Epidermal growth factor receptor",        expressionMean: 6.88, mutationFrequency: 0.22 },
  { geneId: "ENSG00000141510", geneName: "TP53",   chromosome: "17p13.1",  cancerRelevance: "tumor_suppressor", description: "Tumour protein p53",                      expressionMean: 3.91, mutationFrequency: 0.48 },
  { geneId: "ENSG00000171862", geneName: "PTEN",   chromosome: "10q23.31", cancerRelevance: "tumor_suppressor", description: "Phosphatase and tensin homolog",          expressionMean: 2.14, mutationFrequency: 0.14 },
  { geneId: "ENSG00000136997", geneName: "MYC",    chromosome: "8q24.21",  cancerRelevance: "oncogene",         description: "MYC proto-oncogene, bHLH transcription factor", expressionMean: 5.12, mutationFrequency: 0.21 },
  { geneId: "ENSG00000012048", geneName: "BRCA1",  chromosome: "17q21.31", cancerRelevance: "tumor_suppressor", description: "BRCA1 DNA repair associated",             expressionMean: 1.88, mutationFrequency: 0.09 },
  { geneId: "ENSG00000139618", geneName: "BRCA2",  chromosome: "13q12.3",  cancerRelevance: "tumor_suppressor", description: "BRCA2 DNA repair associated",             expressionMean: 1.77, mutationFrequency: 0.07 },
  { geneId: "ENSG00000157764", geneName: "BRAF",   chromosome: "7q34",     cancerRelevance: "oncogene",         description: "B-Raf proto-oncogene, serine/threonine kinase", expressionMean: 3.62, mutationFrequency: 0.11 },
  { geneId: "ENSG00000121879", geneName: "PIK3CA", chromosome: "3q26.32",  cancerRelevance: "oncogene",         description: "Phosphatidylinositol-4,5-bisphosphate 3-kinase", expressionMean: 4.77, mutationFrequency: 0.26 },
  { geneId: "ENSG00000105173", geneName: "CCND1",  chromosome: "11q13.3",  cancerRelevance: "oncogene",         description: "Cyclin D1",                               expressionMean: 3.48, mutationFrequency: 0.13 },
  { geneId: "ENSG00000168036", geneName: "CTNNB1", chromosome: "3p22.1",   cancerRelevance: "both",             description: "Catenin beta 1",                          expressionMean: 4.22, mutationFrequency: 0.17 },
];

router.get("/genes/search", async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string ?? "").toLowerCase();
  const results = q ? GENE_DB.filter(g => g.geneName.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)) : GENE_DB;
  res.json(results);
});

router.get("/genes/:geneId", async (req: Request, res: Response): Promise<void> => {
  const geneId = Array.isArray(req.params.geneId) ? req.params.geneId[0] : req.params.geneId;
  const gene = GENE_DB.find(g => g.geneId === geneId || g.geneName.toLowerCase() === geneId.toLowerCase());
  if (!gene) { res.status(404).json({ error: "Gene not found" }); return; }
  res.json({
    ...gene,
    function: `${gene.geneName} encodes a critical protein involved in cancer cell signaling. It plays key roles in cell proliferation, survival, and differentiation. Mutations or aberrant expression are frequently observed in multiple cancer types.`,
    pathways: ["MAPK/ERK Signaling", "PI3K-AKT-mTOR Pathway", "Cell Cycle Regulation", "DNA Damage Response"],
    relatedGenes: ["TP53", "AKT1", "MTOR", "CDK4", "MDM2"],
    expressionProfile: CANCER_SUBTYPES.map(s => ({
      subtype: s.name,
      meanExpression: +(gene.expressionMean + (Math.random() - 0.5) * 3).toFixed(3),
      stdDev: +(0.5 + Math.random() * 1.2).toFixed(3),
    })),
    mutationTypes: [
      { type: "Missense", frequency: 0.58 }, { type: "Amplification", frequency: 0.22 },
      { type: "Deletion", frequency: 0.12 }, { type: "Frameshift", frequency: 0.08 },
    ],
  });
});

// ─── Pathways ─────────────────────────────────────────────────────────────────

router.get("/pathways/enrichment", async (_req: Request, res: Response): Promise<void> => {
  res.json([
    { pathwayId: "hsa05224", pathwayName: "Breast cancer",                 database: "KEGG", pValue: 2.1e-8,  adjustedPValue: 4.8e-7, geneCount: 14, geneRatio: 0.68, genes: ["ERBB2","PIK3CA","TP53","BRCA1","BRCA2","CCND1"], category: "Cancer" },
    { pathwayId: "hsa04010", pathwayName: "MAPK signaling pathway",        database: "KEGG", pValue: 8.4e-7,  adjustedPValue: 9.6e-6, geneCount: 18, geneRatio: 0.52, genes: ["KRAS","BRAF","EGFR","MAP2K1","RAF1"],            category: "Signaling" },
    { pathwayId: "hsa04151", pathwayName: "PI3K-Akt signaling pathway",    database: "KEGG", pValue: 1.2e-6,  adjustedPValue: 1.1e-5, geneCount: 21, geneRatio: 0.47, genes: ["PIK3CA","PTEN","AKT1","MTOR","PDK1"],           category: "Signaling" },
    { pathwayId: "hsa04115", pathwayName: "p53 signaling pathway",         database: "KEGG", pValue: 3.7e-6,  adjustedPValue: 2.8e-5, geneCount: 12, geneRatio: 0.62, genes: ["TP53","MDM2","CDKN1A","BAX","PUMA"],            category: "Cell Cycle" },
    { pathwayId: "hsa04110", pathwayName: "Cell cycle",                    database: "KEGG", pValue: 5.2e-6,  adjustedPValue: 3.6e-5, geneCount: 16, geneRatio: 0.44, genes: ["CCND1","CDK4","CDK6","RB1","E2F1"],             category: "Cell Cycle" },
    { pathwayId: "hsa05230", pathwayName: "Central carbon metabolism in cancer", database: "KEGG", pValue: 1.9e-5, adjustedPValue: 1.1e-4, geneCount: 9, geneRatio: 0.38, genes: ["MYC","KRAS","IDH1","PKM"],                  category: "Metabolism" },
    { pathwayId: "hsa04066", pathwayName: "HIF-1 signaling pathway",       database: "KEGG", pValue: 4.1e-5,  adjustedPValue: 2.1e-4, geneCount: 11, geneRatio: 0.35, genes: ["VEGFA","EGFR","AKT1","MTOR","HIF1A"],          category: "Signaling" },
    { pathwayId: "hsa04310", pathwayName: "Wnt signaling pathway",         database: "KEGG", pValue: 7.8e-5,  adjustedPValue: 3.8e-4, geneCount: 13, geneRatio: 0.31, genes: ["CTNNB1","APC","TCF7","AXIN1","GSK3B"],          category: "Signaling" },
  ]);
});

router.get("/pathways/go-terms", async (_req: Request, res: Response): Promise<void> => {
  res.json([
    { termId: "GO:0007165", termName: "Signal transduction",               ontology: "BP", pValue: 1.2e-9,  geneCount: 28, genes: ["EGFR","KRAS","BRAF","PIK3CA","AKT1"] },
    { termId: "GO:0000278", termName: "Mitotic cell cycle",                ontology: "BP", pValue: 3.4e-8,  geneCount: 19, genes: ["CCND1","CDK4","CDK6","TP53","RB1"] },
    { termId: "GO:0006974", termName: "Cellular response to DNA damage",   ontology: "BP", pValue: 7.8e-7,  geneCount: 15, genes: ["BRCA1","BRCA2","TP53","ATM","RAD51"] },
    { termId: "GO:0016301", termName: "Kinase activity",                   ontology: "MF", pValue: 2.1e-6,  geneCount: 22, genes: ["EGFR","ERBB2","BRAF","SRC","AKT1"] },
    { termId: "GO:0004672", termName: "Protein kinase activity",           ontology: "MF", pValue: 5.4e-6,  geneCount: 18, genes: ["CDK4","CDK6","AURKB","MAP2K1","JAK2"] },
    { termId: "GO:0005634", termName: "Nucleus",                           ontology: "CC", pValue: 8.9e-5,  geneCount: 31, genes: ["TP53","MYC","BRCA1","E2F1","FOXO3"] },
    { termId: "GO:0005886", termName: "Plasma membrane",                   ontology: "CC", pValue: 1.4e-4,  geneCount: 24, genes: ["EGFR","ERBB2","KRAS","CD274","NOTCH1"] },
    { termId: "GO:0045087", termName: "Innate immune response",            ontology: "BP", pValue: 2.2e-4,  geneCount: 11, genes: ["PDCD1","CD274","STAT3","JAK2","IRF3"] },
  ]);
});

// ─── Pipeline ─────────────────────────────────────────────────────────────────

router.get("/pipeline/stages", async (_req: Request, res: Response): Promise<void> => {
  res.json({
    currentStage: 5, overallProgress: 1.0, lastRun: "2026-05-22T08:30:00Z",
    stages: [
      { id: 1, name: "Data Ingestion",          description: "Collect raw microarray data from TCGA/GEO/GDC portals and validate file integrity", status: "completed", progress: 1.0, durationMs: 12400, technologies: ["Python","Pandas","GDC API"],          metrics: "150 samples, 20,531 genes, 0 errors" },
      { id: 2, name: "Preprocessing & QC",       description: "Normalization (RMA/RPKM), batch correction, outlier removal, and quality control filtering", status: "completed", progress: 1.0, durationMs: 28700, technologies: ["Scanpy","NumPy","scikit-learn"],     metrics: "147 samples passed QC (98%), 20,531 → 18,420 genes" },
      { id: 3, name: "Feature Extraction",       description: "PPI network construction, graph feature computation, autoencoder latent space encoding", status: "completed", progress: 1.0, durationMs: 45200, technologies: ["NetworkX","PyG","TensorFlow"],       metrics: "512-dim embeddings, 3,847 PPI edges" },
      { id: 4, name: "GNN Model Training",       description: "Graph Neural Network training on PPI networks with cross-validation and hyperparameter tuning", status: "completed", progress: 1.0, durationMs: 184600, technologies: ["PyTorch Geometric","TensorFlow","CUDA"], metrics: "100 epochs, val_acc=92.4%, AUC=0.978" },
      { id: 5, name: "Evaluation & Validation",  description: "5-fold cross-validation, SHAP explainability, clinical benchmark comparison", status: "completed", progress: 1.0, durationMs: 38100, technologies: ["scikit-learn","SHAP","Matplotlib"],     metrics: "F1=0.914, superior to 3 baseline methods" },
      { id: 6, name: "Inference API",            description: "RESTful API deployment, caching layer, real-time classification serving", status: "completed", progress: 1.0, durationMs: 8200,  technologies: ["Express","Node.js","Redis"],          metrics: "p95 latency=3.2s, 99.8% uptime" },
    ],
  });
});

router.get("/pipeline/runs", async (_req: Request, res: Response): Promise<void> => {
  res.json([
    { id: "RUN-2026-047", startedAt: "2026-05-22T08:00:00Z", completedAt: "2026-05-22T08:30:42Z", status: "completed", samplesProcessed: 5, accuracy: 0.924, durationMs: 1842000 },
    { id: "RUN-2026-046", startedAt: "2026-05-21T14:00:00Z", completedAt: "2026-05-21T14:28:18Z", status: "completed", samplesProcessed: 3, accuracy: 0.931, durationMs: 1698000 },
    { id: "RUN-2026-045", startedAt: "2026-05-20T10:00:00Z", completedAt: "2026-05-20T10:31:22Z", status: "completed", samplesProcessed: 4, accuracy: 0.918, durationMs: 1882000 },
    { id: "RUN-2026-044", startedAt: "2026-05-19T09:00:00Z", completedAt: null,                   status: "failed",    samplesProcessed: 1, accuracy: null,  durationMs: null     },
    { id: "RUN-2026-043", startedAt: "2026-05-18T11:00:00Z", completedAt: "2026-05-18T11:29:55Z", status: "completed", samplesProcessed: 6, accuracy: 0.929, durationMs: 1795000 },
  ]);
});

// ─── Reports ──────────────────────────────────────────────────────────────────

router.get("/reports", async (_req: Request, res: Response): Promise<void> => {
  res.json([
    { id: "RPT-001", title: "Comprehensive Cancer Classification Report — May 2026",     type: "comprehensive", createdAt: "2026-05-22T09:00:00Z", status: "ready",     sampleCount: 10, fileSizeKb: 2840.4 },
    { id: "RPT-002", title: "Model Performance Evaluation Q2 2026",                      type: "performance",   createdAt: "2026-05-20T14:30:00Z", status: "ready",     sampleCount: 10, fileSizeKb: 1124.8 },
    { id: "RPT-003", title: "Kaplan-Meier Survival Analysis — All Subtypes",             type: "survival",      createdAt: "2026-05-18T10:00:00Z", status: "ready",     sampleCount: 10, fileSizeKb:  712.2 },
    { id: "RPT-004", title: "KEGG Pathway Enrichment Analysis",                          type: "pathway",       createdAt: "2026-05-17T16:00:00Z", status: "ready",     sampleCount: 10, fileSizeKb:  845.6 },
    { id: "RPT-005", title: "TCGA-A7-A0CE Individual Sample Report",                     type: "analysis",      createdAt: "2026-05-22T10:23:03Z", status: "ready",     sampleCount:  1, fileSizeKb:  321.0 },
    { id: "RPT-006", title: "Weekly Summary Report — W21 2026",                          type: "comprehensive", createdAt: "2026-05-22T11:00:00Z", status: "generating", sampleCount:  7, fileSizeKb: null    },
  ]);
});

// ─── Notifications ────────────────────────────────────────────────────────────

router.get("/notifications", async (_req: Request, res: Response): Promise<void> => {
  res.json([
    { id: "NTF-001", type: "success", title: "Analysis Complete",          message: "Sample TCGA-A7-A0CE classified as BRCA (Breast) with 94.7% confidence.", createdAt: "2026-05-22T10:23:03Z", read: false },
    { id: "NTF-002", type: "success", title: "Pipeline Run Completed",     message: "RUN-2026-047 processed 5 samples successfully. Mean accuracy: 92.4%.",   createdAt: "2026-05-22T08:30:42Z", read: false },
    { id: "NTF-003", type: "info",    title: "New Dataset Available",      message: "TCGA Pan-Cancer Atlas v38 is now available. 2,841 new samples added.",   createdAt: "2026-05-21T09:00:00Z", read: false },
    { id: "NTF-004", type: "warning", title: "Low Confidence Prediction",  message: "Sample TCGA-CH-5741 scored 85.9% confidence. Manual review recommended.", createdAt: "2026-05-20T08:45:03Z", read: true  },
    { id: "NTF-005", type: "error",   title: "Pipeline Run Failed",        message: "RUN-2026-044 failed during preprocessing. Check data format for TCGA-XX.", createdAt: "2026-05-19T09:18:00Z", read: true  },
    { id: "NTF-006", type: "info",    title: "Model Update Available",     message: "GNN-AE v2.5.0 available with improved LUAD classification (+3.2% F1).",   createdAt: "2026-05-18T12:00:00Z", read: true  },
    { id: "NTF-007", type: "success", title: "Report Generated",           message: "Comprehensive Cancer Classification Report is ready for download.",       createdAt: "2026-05-22T09:00:00Z", read: false },
  ]);
});

// ─── Datasets ─────────────────────────────────────────────────────────────────

router.get("/datasets", async (_req: Request, res: Response): Promise<void> => {
  res.json([
    { id: "DS-001", name: "TCGA Pan-Cancer Atlas",      source: "GDC Data Portal",           samples: 11315, genes: 20531, cancerTypes: ["BRCA","LUAD","COAD","GBM","PRAD","STAD","KIRC","BLCA","LIHC","UCEC"], lastUpdated: "2026-05-01T00:00:00Z", status: "active",  description: "The Cancer Genome Atlas comprehensive multi-platform analysis across 33 cancer types" },
    { id: "DS-002", name: "GEO Gene Expression Omnibus",source: "NCBI GEO",                  samples:  4821, genes: 18902, cancerTypes: ["BRCA","LUAD","COAD","GBM"], lastUpdated: "2026-04-15T00:00:00Z", status: "active",  description: "NCBI public functional genomics data repository with curated gene expression datasets" },
    { id: "DS-003", name: "CCLE (Cancer Cell Lines)",   source: "Broad Institute",           samples:  1457, genes: 19714, cancerTypes: ["BRCA","LUAD","COAD","GBM","PRAD","SKCM","OV"],                     lastUpdated: "2026-03-20T00:00:00Z", status: "active",  description: "Cancer Cell Line Encyclopedia with genomic and pharmacological profiling" },
    { id: "DS-004", name: "METABRIC",                   source: "EBI ArrayExpress",          samples:  1992, genes: 17882, cancerTypes: ["BRCA"],                                                             lastUpdated: "2026-02-10T00:00:00Z", status: "active",  description: "Molecular Taxonomy of Breast Cancer International Consortium dataset" },
    { id: "DS-005", name: "TARGET (Pediatric)",         source: "GDC Data Portal",           samples:   981, genes: 20531, cancerTypes: ["AML","NBL","WT","OS"],                                             lastUpdated: "2026-01-05T00:00:00Z", status: "syncing", description: "Therapeutically Applicable Research to Generate Effective Treatments — pediatric cancers" },
    { id: "DS-006", name: "COSMIC v97",                 source: "Sanger Institute",          samples:  6500, genes: 21472, cancerTypes: ["BRCA","LUAD","COAD","GBM","PRAD","ALL","CLL","AML"],               lastUpdated: "2025-12-01T00:00:00Z", status: "archived",description: "Catalogue Of Somatic Mutations In Cancer — somatic mutation landscape" },
  ]);
});

// ─── Comparison ───────────────────────────────────────────────────────────────

router.post("/comparison/samples", async (req: Request, res: Response): Promise<void> => {
  const { analysisIds } = req.body;
  if (!analysisIds || !Array.isArray(analysisIds)) { res.status(400).json({ error: "analysisIds array required" }); return; }
  const analyses = ANALYSES.filter(a => analysisIds.includes(a.id) && a.status === "completed");
  const sharedBiomarkers = ["TP53", "PIK3CA", "EGFR"];
  const subtypeAgreement = new Set(analyses.map(a => a.cancerSubtype)).size === 1;
  const overlap = analyses.length > 1 ? +(0.3 + Math.random() * 0.4).toFixed(3) : 1;
  const uniqueBiomarkers = analyses.map(a => ({
    analysisId: a.id, sampleId: a.sampleId,
    biomarkers: BIOMARKERS.filter(b => b.cancerSubtype === a.cancerSubtype).map(b => b.geneName).slice(0, 4),
  }));
  res.json({ analyses, sharedBiomarkers, uniqueBiomarkers, subtypeAgreement, biomarkerOverlap: overlap });
});

export default router;
