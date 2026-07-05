import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Database, Clock } from "lucide-react";

const DATASETS = [
  { name: "TCGA", full: "The Cancer Genome Atlas", status: "Demo", samples: "11,000+", genes: "20,500", types: "33 cancer types", sync: "Demo metadata cached 2026-06-20" },
  { name: "GEO", full: "Gene Expression Omnibus", status: "Demo", samples: "4,200+", genes: "18,900", types: "Multiple", sync: "Demo metadata cached 2026-06-18" },
  { name: "CCLE", full: "Cancer Cell Line Encyclopedia", status: "Planned", samples: "1,450", genes: "19,200", types: "Cell line panel", sync: "Not yet connected" },
  { name: "COSMIC", full: "Catalogue of Somatic Mutations in Cancer", status: "Planned", samples: "1.5M+ mutations", genes: "N/A (mutation-focused)", types: "Pan-cancer", sync: "Not yet connected" },
  { name: "ICGC", full: "International Cancer Genome Consortium", status: "Planned", samples: "20,000+", genes: "Varies", types: "78 projects", sync: "Not yet connected" },
];

const STATUS_COLOR: Record<string, string> = {
  Connected: BADGE_COLORS.success,
  Demo: BADGE_COLORS.demo,
  Planned: BADGE_COLORS.planned,
};

export default function DatasetIntegration() {
  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={Database}
          title="Dataset Integration"
          description="Preview of external cancer genomics dataset sources planned for direct platform integration."
          badges={[{ label: "Demo Metadata", color: BADGE_COLORS.demo }]}
        />
        <PrototypeBanner text="Demo metadata integration. Live data sync with TCGA, GEO, CCLE, COSMIC, and ICGC is planned for production and is not active in this prototype." />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DATASETS.map(d => (
            <Card key={d.name} className="border-border/60">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{d.name}</span>
                  <Badge className={`${STATUS_COLOR[d.status]} border-0`}>{d.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{d.full}</p>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-secondary/40 rounded-md py-1.5">
                    <div className="text-sm font-bold">{d.samples}</div>
                    <div className="text-[10px] text-muted-foreground">Samples</div>
                  </div>
                  <div className="bg-secondary/40 rounded-md py-1.5">
                    <div className="text-sm font-bold">{d.genes}</div>
                    <div className="text-[10px] text-muted-foreground">Genes</div>
                  </div>
                  <div className="bg-secondary/40 rounded-md py-1.5">
                    <div className="text-sm font-bold">{d.types}</div>
                    <div className="text-[10px] text-muted-foreground">Cancer Types</div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {d.sync}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
