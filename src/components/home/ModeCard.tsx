import Link from "next/link";
import type { RoomType } from "@/types";

interface ModeCardProps {
  type: RoomType;
  title: string;
  description: string;
  features: string[];
  href: string;
  buttonLabel: string;
}

export default function ModeCard({
  type,
  title,
  description,
  features,
  href,
  buttonLabel,
}: ModeCardProps) {
  const isDebate = type === "debate";

  const accentColor = isDebate ? "text-indigo-400" : "text-amber-400";
  const borderColor = isDebate
    ? "border-indigo-900/60 hover:border-indigo-700/60"
    : "border-amber-900/60 hover:border-amber-700/60";
  const gradientBg = isDebate
    ? "from-indigo-950/50 to-slate-900"
    : "from-amber-950/50 to-slate-900";
  const buttonClass = isDebate
    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
    : "bg-amber-500 hover:bg-amber-400 text-slate-950";
  const tagClass = isDebate
    ? "bg-indigo-900/50 text-indigo-300"
    : "bg-amber-900/50 text-amber-300";

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-gradient-to-br p-6 transition-colors ${borderColor} ${gradientBg}`}
    >
      <div className={`mb-1 text-xs font-semibold uppercase tracking-widest ${accentColor}`}>
        {isDebate ? "DEBATE" : "BANTER"}
      </div>
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-3 text-slate-400">{description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {features.map((f) => (
          <span
            key={f}
            className={`rounded-full px-3 py-1 text-xs font-medium ${tagClass}`}
          >
            {f}
          </span>
        ))}
      </div>

      <Link
        href={href}
        className={`mt-6 inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-medium transition-colors ${buttonClass}`}
      >
        {buttonLabel}
      </Link>
    </div>
  );
}
