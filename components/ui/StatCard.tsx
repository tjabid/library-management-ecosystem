import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "default" | "warning" | "danger" | "success";
  description?: string;
  href?: string;
}

const variantClasses = {
  default: {
    card: "bg-white border-emerald-100",
    iconWrap: "bg-gradient-to-br from-emerald-700 to-emerald-800 shadow-emerald-200",
    icon: "text-white",
    value: "text-slate-900",
    accent: "bg-emerald-700",
  },
  success: {
    card: "bg-white border-emerald-100",
    iconWrap: "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200",
    icon: "text-white",
    value: "text-slate-900",
    accent: "bg-emerald-500",
  },
  warning: {
    card: "bg-white border-amber-100",
    iconWrap: "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200",
    icon: "text-white",
    value: "text-slate-900",
    accent: "bg-amber-500",
  },
  danger: {
    card: "bg-white border-red-100",
    iconWrap: "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-200",
    icon: "text-white",
    value: "text-slate-900",
    accent: "bg-red-500",
  },
};

export function StatCard({ label, value, icon: Icon, variant = "default", description, href }: StatCardProps) {
  const classes = variantClasses[variant];

  const cardClass = cn(
    "relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 block",
    href && "cursor-pointer",
    classes.card
  );

  const content = (
    <>
      {/* Subtle top accent line */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5", classes.accent)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className={cn("text-3xl font-bold mt-1.5 leading-none tabular-nums", classes.value)}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-slate-400 mt-1.5">{description}</p>
          )}
        </div>
        <div
          className={cn(
            "flex-shrink-0 p-3 rounded-xl shadow-lg",
            classes.iconWrap
          )}
        >
          <Icon className={cn("h-5 w-5", classes.icon)} />
        </div>
      </div>
    </>
  );

  if (href) {
    return <Link href={href} className={cardClass}>{content}</Link>;
  }

  return <div className={cardClass}>{content}</div>;
}
