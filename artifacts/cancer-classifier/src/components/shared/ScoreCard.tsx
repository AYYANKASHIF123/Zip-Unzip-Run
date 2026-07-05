import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface ScoreCardProps {
  icon: LucideIcon;
  title: string;
  score: number;
  reason: string;
  color: string;
}

export function ScoreCard({ icon: Icon, title, score, reason, color }: ScoreCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">{title}</span>
          </div>
          <span className="text-2xl font-bold tabular-nums" style={{ color }}>{score}%</span>
        </div>
        <div className="h-2 rounded-full bg-secondary mt-3 mb-3">
          <div className="h-2 rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>
      </CardContent>
    </Card>
  );
}

export function ProgressRow({ label, score }: { label: string; score: number }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">{score}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary">
        <div className="h-2 rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
