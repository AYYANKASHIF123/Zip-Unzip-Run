import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionTitle, BADGE_COLORS } from "@/components/shared/PageHeader";
import { PrototypeBanner } from "@/components/shared/PrototypeBanner";
import { Share2 } from "lucide-react";

const GENES = ["EGFR", "ERBB2", "TP53", "BRCA1", "AR", "KRAS", "PIK3CA", "PTEN", "MYC", "CDKN2A"];
const EDGES: [string, string][] = [
  ["EGFR", "ERBB2"], ["EGFR", "KRAS"], ["EGFR", "PIK3CA"], ["TP53", "BRCA1"],
  ["TP53", "CDKN2A"], ["TP53", "MYC"], ["BRCA1", "PTEN"], ["PIK3CA", "PTEN"],
  ["KRAS", "MYC"], ["AR", "MYC"], ["PTEN", "CDKN2A"],
];
const TOP_CONTRIBUTING = new Set(["TP53", "BRCA1", "EGFR"]);

function layoutPositions(genes: string[]) {
  const cx = 260, cy = 200, r = 150;
  return Object.fromEntries(
    genes.map((g, i) => {
      const angle = (i / genes.length) * 2 * Math.PI - Math.PI / 2;
      return [g, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }];
    })
  );
}

export default function PpiNetwork() {
  const [filter, setFilter] = useState<string | null>(null);
  const positions = useMemo(() => layoutPositions(GENES), []);

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <PageHeader
          icon={Share2}
          title="PPI Network Visualisation"
          description="Protein-protein interaction network for genes relevant to the classifier, highlighting top contributing genes and central hubs."
          badges={[{ label: "Research Preview", color: BADGE_COLORS.researchPreview }]}
        />
        <PrototypeBanner text="Interaction data shown uses a small illustrative example gene set. It is not a live query against STRING DB or another PPI database." />

        <Card className="border-border/60">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Network Graph</SectionTitle>
              <div className="flex gap-1.5 flex-wrap">
                <Button size="sm" variant={filter === null ? "default" : "outline"} onClick={() => setFilter(null)}>All</Button>
                <Button size="sm" variant={filter === "top" ? "default" : "outline"} onClick={() => setFilter("top")}>Top Contributing</Button>
              </div>
            </div>
            <svg viewBox="0 0 520 400" className="w-full h-[400px]">
              {EDGES.map(([a, b]) => {
                const pa = positions[a], pb = positions[b];
                return <line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1.5} />;
              })}
              {GENES.map(g => {
                const p = positions[g];
                const isTop = TOP_CONTRIBUTING.has(g);
                const dim = filter === "top" && !isTop;
                return (
                  <g key={g} opacity={dim ? 0.25 : 1}>
                    <circle cx={p.x} cy={p.y} r={isTop ? 22 : 16} fill={isTop ? "#8b5cf6" : "#3b82f6"} fillOpacity={0.85} />
                    <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={10} fill="white" fontWeight={600}>{g}</text>
                  </g>
                );
              })}
            </svg>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {GENES.map(g => (
            <Badge key={g} className={TOP_CONTRIBUTING.has(g) ? `${BADGE_COLORS.prototype} border-0` : "border-0 bg-secondary text-foreground"}>{g}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
