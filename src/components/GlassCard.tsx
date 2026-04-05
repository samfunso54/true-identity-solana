import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export const GlassCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-xl border border-border/50 bg-card/60 backdrop-blur-lg p-6 shadow-lg",
      className
    )}
  >
    {children}
  </div>
);
