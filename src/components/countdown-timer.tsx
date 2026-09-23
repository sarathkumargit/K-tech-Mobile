import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

function getRemaining(end: string): Remaining {
  const diff = new Date(end).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
    expired: false,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

// `compact`: four equal cells that always fit their container (product cards
// on small phones); otherwise fixed-size cells.
export function CountdownTimer({
  end,
  className,
  compact,
}: {
  end: string;
  className?: string;
  compact?: boolean;
}) {
  // Starts empty and fills in after mount: the server and browser clocks
  // differ by a few seconds, which would otherwise cause a hydration mismatch.
  const [t, setT] = useState<Remaining | null>(null);

  useEffect(() => {
    setT(getRemaining(end));
    const i = setInterval(() => setT(getRemaining(end)), 1000);
    return () => clearInterval(i);
  }, [end]);

  if (t?.expired) {
    return (
      <span className={cn("text-xs font-medium text-muted-foreground", className)}>
        Offer ended
      </span>
    );
  }

  const cells = [
    { v: t?.days, l: "Days" },
    { v: t?.hours, l: "Hrs" },
    { v: t?.minutes, l: "Min" },
    { v: t?.seconds, l: "Sec" },
  ];

  return (
    <div className={cn(compact ? "grid max-w-56 grid-cols-4 gap-1" : "flex gap-1.5", className)}>
      {cells.map((c) => (
        <div
          key={c.l}
          className={cn(
            "flex flex-col items-center rounded-lg bg-cozy-burnt py-1 text-primary-foreground",
            compact ? "min-w-0 px-0.5" : "min-w-10 px-2",
          )}
        >
          <span
            className={cn(
              "font-display leading-none tabular-nums",
              compact ? "text-sm sm:text-base" : "text-base",
            )}
          >
            {c.v === undefined ? "--" : pad(c.v)}
          </span>
          <span className="text-[8px] uppercase tracking-wide opacity-80 sm:text-[9px]">{c.l}</span>
        </div>
      ))}
    </div>
  );
}
