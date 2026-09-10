import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Standard wrapper for every authenticated page. Controls the maximum width,
 * horizontal padding and vertical spacing so pages never hard-code their own
 * widths. The main element handles scrolling; this never introduces overflow.
 */
export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={["mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8", className].join(" ")}>
      {children}
    </div>
  );
}
