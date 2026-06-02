import { ReactNode } from "react";

export function Card({
  title,
  value,
  subtitle,
  children,
  className,
}: {
  title?: string;
  value?: string | number;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/60 ${className || ""}`}>
      {children ? (
        children
      ) : (
        <div className="p-5">
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}

