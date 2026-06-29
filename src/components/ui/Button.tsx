import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "amber" | "danger";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-indigo-600 text-white border-transparent hover:bg-indigo-500",
    secondary:
      "bg-slate-700 text-white border-slate-600 hover:bg-slate-600",
    ghost:
      "bg-transparent text-slate-300 border-slate-700 hover:bg-slate-800",
    amber:
      "bg-amber-500 text-slate-950 border-transparent hover:bg-amber-400",
    danger:
      "bg-red-700 text-white border-transparent hover:bg-red-600",
  };

  const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-7 py-3.5 text-lg",
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant ?? "primary"]} ${sizeClasses[size ?? "md"]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
