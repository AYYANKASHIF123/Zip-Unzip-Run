import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Layers, Upload } from "lucide-react";

const OMICS_TYPES = [
  { key: "rna", label: "RNA Expression", desc: "RNA-seq gene expression profile — the platform's core data type." },
  { key: "mutation", label: "Mutation", desc: "DNA mutation profile (SNVs, indels) per sample." },
  { key: "methylation", label: "Methylation", desc: "DNA methylation beta-values across CpG sites." },
  { key: "proteomics", label: "Proteomics", desc: "Protein abundance data (e.g. RPPA / mass spectrometry)." },
];

export default function MultiOmics() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={Layers}
          title="Multi-Omics Integration"
          description="Research preview of combining multiple molecular data layers for richer subtype classification."
          badges={[{ label: "Research Preview", color: BADGE_COLORS.researchPreview }]}
        />
        <PrototypeBanner text="Multi-omics research preview. Prototype supports demo data fusion only — the production model currently trains on RNA-seq expression data alone." />

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <Tabs defaultValue="rna">
              <TabsList className="grid grid-cols-4">
                {OMICS_TYPES.map(o => <TabsTrigger key={o.key} value={o.key}>{o.label}</TabsTrigger>)}
              </TabsList>
              {OMICS_TYPES.map(o => (
                <TabsContent key={o.key} value={o.key} className="pt-4">
                  <p className="text-sm text-muted-foreground mb-3">{o.desc}</p>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
                    <Upload className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-xs">Upload demo {o.label} CSV (research preview)</p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <div className="font-bold text-sm mb-2">Combined Result Summary (Demo)</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="bg-secondary/40 rounded-md py-3">
                <div className="text-lg font-bold">RNA-seq</div>
                <div className="text-[10px] text-muted-foreground">Primary signal</div>
              </div>
              <div className="bg-secondary/40 rounded-md py-3">
                <div className="text-lg font-bold">+12%</div>
                <div className="text-[10px] text-muted-foreground">Simulated confidence uplift</div>
              </div>
              <div className="bg-secondary/40 rounded-md py-3">
                <div className="text-lg font-bold">4</div>
                <div className="text-[10px] text-muted-foreground">Omics layers fused</div>
              </div>
              <div className="bg-secondary/40 rounded-md py-3">
                <div className="text-lg font-bold">Demo</div>
                <div className="text-[10px] text-muted-foreground">Data fusion mode</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
