import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badges?: { label: string; color: string }[];
}

export function PageHeader({ icon: Icon, title, description, badges = [] }: PageHeaderProps) {
  return (
    <div className="space-y-3">
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map(b => (
            <Badge key={b.label} className={`${b.color} border-0 font-medium`}>{b.label}</Badge>
          ))}
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold mb-2 flex items-center gap-2">{children}</h2>;
}

export const BADGE_COLORS = {
  prototype: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  demo: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  researchPreview: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  planned: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  success: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};
