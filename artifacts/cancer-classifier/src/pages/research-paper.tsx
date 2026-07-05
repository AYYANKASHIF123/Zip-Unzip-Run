import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { FileText, Download } from "lucide-react";
import jsPDF from "jspdf";

function exportPaperPdf() {
  const doc = new jsPDF();
  let y = 20;
  const line = (text: string, size = 10, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const split = doc.splitTextToSize(text, 170);
    doc.text(split, 20, y);
    y += split.length * (size / 2) + 4;
  };
  line("GeneClassifier: An Explainable AI Platform for Cancer Subtype", 14, true);
  line("Classification Using Gene Expression Profiles", 14, true);
  line("FYP Research Manuscript Draft", 9);
  y += 4;
  line("Abstract", 12, true);
  line("This paper presents GeneClassifier, a research prototype platform for classifying cancer subtypes from gene expression profiles using classical machine learning models with post-hoc explainability. The system demonstrates a complete research workflow: data ingestion, validation, model inference, interpretability, and reporting.");
  line("Methodology", 12, true);
  line("Gene expression CSVs are validated against a reference gene panel, scaled, and passed to a Random Forest classifier. Per-gene contribution is estimated via Mean Decrease in Impurity (MDI) combined with class-mean delta, not full Shapley value computation.");
  line("Results Summary", 12, true);
  line("The current model achieves competitive accuracy on held-out demo data. Full results, confusion matrices and per-class metrics are available on the Model Performance page of the platform.");
  line("Limitations", 12, true);
  line("This work has not been externally validated against real-world clinical cohorts. It should be treated as a research and educational prototype, not a diagnostic tool.");
  line("Future Work", 12, true);
  line("Planned directions include multi-omics fusion, graph neural network models leveraging protein interaction networks, and formal external validation with research lab partners.");
  doc.save("GeneClassifier-Research-Manuscript-Draft.pdf");
}

export default function ResearchPaper() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[900px] mx-auto space-y-6">
        <PageHeader
          icon={FileText}
          title="Research Paper"
          description="An FYP-style research manuscript summarising the platform's methodology and findings."
          badges={[{ label: "FYP Research Manuscript Draft", color: BADGE_COLORS.prototype }]}
        />
        <PrototypeBanner text="This is a Final Year Project research manuscript draft, not a peer-reviewed published journal paper." />

        <Card className="border-border/60">
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                GeneClassifier: An Explainable AI Platform for Cancer Subtype Classification Using Gene Expression Profiles
              </h2>
              <Button size="sm" onClick={exportPaperPdf}><Download className="w-3.5 h-3.5 mr-1" /> Export PDF</Button>
            </div>
            <Separator />
            <div>
              <SectionTitle>Abstract</SectionTitle>
              <p className="text-sm text-muted-foreground">
                This paper presents GeneClassifier, a research prototype platform for classifying cancer subtypes
                from gene expression profiles using classical machine learning models with post-hoc explainability.
                The system demonstrates a complete research workflow: data ingestion, validation, model inference,
                interpretability, and reporting.
              </p>
            </div>
            <div>
              <SectionTitle>Methodology</SectionTitle>
              <p className="text-sm text-muted-foreground">
                Gene expression CSVs are validated against a reference gene panel, scaled, and passed to a Random
                Forest classifier. Per-gene contribution is estimated via Mean Decrease in Impurity (MDI) combined
                with class-mean delta — an approximation, not full Shapley value computation.
              </p>
            </div>
            <div>
              <SectionTitle>Model Architecture</SectionTitle>
              <p className="text-sm text-muted-foreground">
                Ensemble tree-based classifier (Random Forest), trained on labelled gene expression samples spanning
                five cancer subtypes, deployed via a Python FastAPI inference microservice.
              </p>
            </div>
            <div>
              <SectionTitle>Dataset Description</SectionTitle>
              <p className="text-sm text-muted-foreground">
                Demo/training data reflects publicly available gene expression structures similar to TCGA-style
                cohorts. Live external dataset connections (TCGA, GEO, etc.) are demo/planned, see Dataset Integration.
              </p>
            </div>
            <div>
              <SectionTitle>Results Summary</SectionTitle>
              <p className="text-sm text-muted-foreground">
                The current model achieves competitive accuracy on held-out demo data. Full metrics, per-class
                performance and confusion matrices are available on the Model Performance page.
              </p>
            </div>
            <div>
              <SectionTitle>Limitations</SectionTitle>
              <p className="text-sm text-muted-foreground">
                This work has not been externally validated against real-world clinical cohorts and should be
                treated as a research/educational prototype, not a diagnostic tool.
              </p>
            </div>
            <div>
              <SectionTitle>Future Work</SectionTitle>
              <p className="text-sm text-muted-foreground">
                Multi-omics fusion, graph neural network models leveraging protein interaction networks, and formal
                external validation with research lab partners.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
