import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <div
      className={["rounded-3xl border border-line bg-surface shadow-card", className].join(
        " "
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
