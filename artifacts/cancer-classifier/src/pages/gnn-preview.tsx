import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Network, GitCompareArrows, AlertTriangle } from "lucide-react";

const COMPARISON = [
  { metric: "5-fold CV accuracy", active: "86.52% (TCGA cohort)", gnn: "Not measured" },
  { metric: "5-fold weighted CV F1", active: "86.29% (TCGA cohort)", gnn: "Not measured" },
  { metric: "Explainability", active: "Permutation importance + class-mean delta", gnn: "Not implemented" },
  { metric: "Status", active: "Active research model", gnn: "Not trained — research preview" },
];

const LIMITATIONS = [
  "No production GNN model has been trained on real PPI graph data.",
  "The active-model cross-validation results are not directly comparable to a GNN; no GNN evaluation has been run.",
  "Would require significant compute and a curated protein-interaction graph (e.g. STRING DB) to build.",
];

export default function GnnPreview() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={Network}
          title="GNN Model — Research Preview"
          description="Concept for a future Graph Neural Network model using protein-protein interaction (PPI) graph features."
          badges={[{ label: "Research Preview", color: BADGE_COLORS.researchPreview }, { label: "Not Active Production Model", color: BADGE_COLORS.warning }]}
        />
        <PrototypeBanner tone="warning" text="GNN research preview. Not an active production model. This page documents a proposed architecture, not a trained or benchmarked system." />

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle><Network className="w-4 h-4" /> Proposed Architecture</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
              <div className="bg-secondary/40 rounded-md py-3"><div className="font-bold text-sm">Model Type</div>Graph Neural Network</div>
              <div className="bg-secondary/40 rounded-md py-3"><div className="font-bold text-sm">Input</div>Gene expression + PPI graph</div>
              <div className="bg-secondary/40 rounded-md py-3"><div className="font-bold text-sm">Nodes</div>Genes / proteins</div>
              <div className="bg-secondary/40 rounded-md py-3"><div className="font-bold text-sm">Edges</div>Protein interactions</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle><GitCompareArrows className="w-4 h-4" /> Active Model Reference vs. GNN Research Preview</SectionTitle>
            <div className="space-y-1.5">
              {COMPARISON.map(c => (
                <div key={c.metric} className="grid grid-cols-3 text-xs bg-secondary/30 rounded-md px-3 py-2">
                  <span className="font-medium">{c.metric}</span>
                  <span>{c.active}</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{c.gnn}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <SectionTitle><AlertTriangle className="w-4 h-4 text-amber-500" /> Limitations</SectionTitle>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              {LIMITATIONS.map(l => <li key={l}>{l}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
