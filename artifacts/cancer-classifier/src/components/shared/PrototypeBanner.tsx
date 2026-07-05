import { Info, ShieldAlert } from "lucide-react";

interface PrototypeBannerProps {
  text: string;
  tone?: "info" | "warning";
}

export function PrototypeBanner({ text, tone = "info" }: PrototypeBannerProps) {
  const isWarning = tone === "warning";
  return (
    <div
      className={`flex items-start gap-2 rounded-md border p-3 ${
        isWarning
          ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
          : "border-blue-300 bg-blue-50 dark:bg-blue-950/20"
      }`}
    >
      {isWarning
        ? <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        : <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />}
      <p className={`text-xs leading-relaxed ${isWarning ? "text-amber-800 dark:text-amber-400" : "text-blue-800 dark:text-blue-400"}`}>
        {text}
      </p>
    </div>
  );
}
