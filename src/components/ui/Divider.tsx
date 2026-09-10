import type { ReactNode } from "react";

interface DividerProps {
  children?: ReactNode;
  className?: string;
}

export function Divider({ children, className = "" }: DividerProps) {
  return (
    <div className={["flex items-center gap-4", className].join(" ")}>
      <span className="h-px flex-1 bg-line" />
      {children && (
        <span className="text-[13px] font-medium text-faint">{children}</span>
      )}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
