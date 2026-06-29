import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated";
}

export default function Card({
  variant = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  const variantClasses: Record<NonNullable<CardProps["variant"]>, string> = {
    default: "bg-slate-900 border-slate-800",
    elevated: "bg-slate-800 border-slate-700",
  };

  return (
    <div
      className={`rounded-2xl border p-6 ${variantClasses[variant ?? "default"]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
