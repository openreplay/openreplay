import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Badge } from "@/components/badge/badge";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "text-foreground",
        muted: "text-muted-foreground",
      },
      size: {
        default: "text-md",
        sm: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  label: string;
  required?: boolean;
  helperText?: string;
  icon?: any;
  badge?: string;
  badgeVariant?: "solid" | "outline" | "soft" | "surface";
  wrapperClassName?: string;
}

export default function Label({
  label,
  required = false,
  helperText,
  icon: Icon,
  badge,
  badgeVariant = "solid",
  variant,
  size,
  wrapperClassName,
  className,
  ...props
}: LabelProps) {
  return (
    <div className={cn("space-y-2", wrapperClassName)}>
      <label
        className={cn(
          labelVariants({ variant, size }),
          "inline-flex items-center gap-2",
          className,
        )}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4" />}
        <span className="inline-flex items-center gap-2">
          {label}
          {required && <span className="text-destructive">*</span>}
          {badge && (
            <Badge variant={badgeVariant} className="ml-2">
              {badge}
            </Badge>
          )}
        </span>
      </label>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
