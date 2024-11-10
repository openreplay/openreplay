import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("rounded-md w-fit font-medium transition-colors", {
  variants: {
    variant: {
      solid: "text-white",
      soft: "bg-opacity-10 text-primary bg-zinc-100 dark:bg-neutral-900",
      outline:
        "border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-500 dark:text-neutral-300",
      surface:
        "border border-zinc-200 bg-[#efefef] text-neutral-500 dark:bg-zinc-100/10 dark:border-neutral-700 dark:text-neutral-300 ",
    },
    badgeColor: {
      primary: "bg-primary text-primary-foreground hover:bg-primary/70",
      success: "bg-green-500 text-white border-green-500",
      warning: "bg-yellow-500 text-white border-yellow-500",
      danger: "bg-red-500 text-white border-red-500",
      info: "bg-blue-500 text-white border-blue-500",
    },
    size: {
      small: "h-5 px-2 py-0.5 text-xs",
      medium: "px-3 py-1.5 text-sm",
      large: "h-[1.625rem] px-3 py-1 text-sm",
    },
  },
  defaultVariants: {
    variant: "solid",
    badgeColor: "primary",
    size: "medium",
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  badgeColor?: "primary" | "success" | "warning" | "danger" | "info";
}

function Badge({ className, variant, badgeColor, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ badgeColor, variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
