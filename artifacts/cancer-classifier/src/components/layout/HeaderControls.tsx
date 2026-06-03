import { useState, useRef, useEffect } from "react";
import { RefreshCw, ChevronDown, Printer, Sun, Moon } from "lucide-react";

export const INTERVAL_OPTIONS = [
  { label: "Every 5 min", ms: 5 * 60 * 1000 },
  { label: "Every 15 min", ms: 15 * 60 * 1000 },
  { label: "Every 1 hour", ms: 60 * 60 * 1000 },
];

export function HeaderControls({
  title,
  subtitle,
  lastRefreshed,
  loading,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  lastRefreshed?: string | null;
  loading?: boolean;
  onRefresh?: () => void;
}) {
  const [isDark, setIsDark] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    if (loading) {
      setIsSpinning(true);
      return;
    }
    const t = setTimeout(() => setIsSpinning(false), 600);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="pt-2">
        <h1 className="font-bold text-[32px]">{title}</h1>
        <p className="text-muted-foreground mt-1.5 text-[14px]">{subtitle}</p>
        {lastRefreshed && (
          <p className="text-[12px] text-muted-foreground mt-3">Last refresh: {lastRefreshed}</p>
        )}
      </div>
      <div className="flex items-center gap-3 pt-2 print:hidden">
        {onRefresh && (
          <div className="relative" ref={dropdownRef}>
            <div
              className="flex items-center rounded-[6px] overflow-hidden h-[26px] text-[12px]"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2",
                color: isDark ? "#c8c9cc" : "#4b5563",
              }}
            >
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center gap-1 px-2 h-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <div
                className="w-px h-4 shrink-0"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }}
              />
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center justify-center px-1.5 h-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-md border bg-popover text-popover-foreground shadow-md p-1 z-50">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Auto-refresh</div>
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
                    onClick={() => {
                      setDropdownOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2", color: isDark ? "#c8c9cc" : "#4b5563" }}
          aria-label="Export as PDF"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setIsDark((d) => !d)}
          className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2", color: isDark ? "#c8c9cc" : "#4b5563" }}
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
