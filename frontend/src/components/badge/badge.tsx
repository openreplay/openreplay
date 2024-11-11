import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "rounded-md inline-flex justify-start items-center w-fit font-medium transition-colors",
  {
    variants: {
      variant: {
        solid: "text-primary-foreground bg-primary ",
        soft: "text-primary bg-badge-soft",
        outline:
          "border border-badge-outline-border  bg-transparent text-badge-outline-foreground",
        surface:
          "border border-badge-surface-border bg-badge-surface text-badge-surface-foreground",
      },
      /*will add colors later on */
      size: {
        small: "h-5 px-2 py-0.5 text-xs",
        medium: "px-2 py-0.5 text-sm",
        large: "h-[1.625rem] px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "medium",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
