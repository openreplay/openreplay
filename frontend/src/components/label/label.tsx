import * as React from "react";
import { Badge } from "@/components/badge/badge";
import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  label: string;
  required?: boolean;
  helperText?: string;
  icon?: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
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
  badgeVariant = "outline",
  wrapperClassName,
  className,
  ...props
}: LabelProps) {
  return (
    <div className={cn("flex flex-col gap-1", wrapperClassName)}>
      <label
        className={cn("text-sm font-medium text-primary", className)}
        {...props}
      >
        <span className="inline-flex items-center">
          {label}
          {required && <span className="text-destructive">*</span>}
          {Icon && <Icon className="ml-1 h-4 w-4 text-secondary-text" />}
          {badge && (
            <Badge variant={badgeVariant} size={"small"} className="ml-1">
              {badge}
            </Badge>
          )}
        </span>
      </label>
      {helperText && (
        <p className="mb-1 text-sm text-secondary-text">{helperText}</p>
      )}
    </div>
  );
}
