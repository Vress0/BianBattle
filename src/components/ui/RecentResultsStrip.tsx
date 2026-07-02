import type { UserMatchResultKey } from "@/lib/match-display";
import {
  getResultSymbol,
  getResultSymbolClass,
  getResultBgClass,
  getResultAriaLabel,
} from "@/lib/match-display";

interface Props {
  results: UserMatchResultKey[];
  maxItems?: number;
}

export default function RecentResultsStrip({ results, maxItems = 10 }: Props) {
  const displayed = results.slice(0, maxItems);

  if (displayed.length === 0) {
    return <p className="text-xs text-slate-500">尚無最近戰績</p>;
  }

  return (
    <div className="flex flex-wrap gap-1" aria-label="最近戰績">
      {displayed.map((r, i) => (
        <span
          key={i}
          className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${getResultBgClass(r)} ${getResultSymbolClass(r)}`}
          title={getResultAriaLabel(r)}
          aria-label={getResultAriaLabel(r)}
        >
          {getResultSymbol(r)}
        </span>
      ))}
    </div>
  );
}
