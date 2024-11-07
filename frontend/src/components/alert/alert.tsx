import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import {
  AlertDescription,
  AlertTitle,
  Alert as ShadAlert,
} from "@/shadcn-components/alert";
import {
  X,
  CircleAlert,
  TriangleAlert,
  CircleCheck,
  OctagonAlert,
} from "lucide-react";

const alertVariants = cva(
  "relative w-full max-w-[34rem] gap-3 rounded-lg border font-medium p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-alert-bg text-foreground dark:border-neutral-700",
        destructive:
          "bg-alert-bg-destructive border-alert-border-destructive text-alert-destructive  [&>svg]:text-alert-destructive",
        success:
          "border-alert-success/50 bg-alert-bg-success text-alert-success dark:border-alert-success [&>svg]:text-alert-success",
        warning:
          "border-alert-border-warning bg-alert-bg-warning text-alert-warning [&>svg]:text-alert-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const iconMap = {
  default: CircleAlert,
  destructive: TriangleAlert,
  success: CircleCheck,
  warning: OctagonAlert,
};

type VariantKey = keyof typeof iconMap;

interface IAlertProps
  extends React.HTMLProps<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title: string;
  description: string;
  variant?: VariantKey;
  dismissable?: boolean;
  onDismiss?: () => void;
}

const Alert = ({
  className,
  title,
  description,
  variant = "default",
  dismissable = true,
  onDismiss,
  ...props
}: IAlertProps) => {
  const Icon = iconMap[variant];

  return (
    <ShadAlert className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 h-5 w-5" />
      <AlertTitle className="mb-2 text-base">{title}</AlertTitle>
      <AlertDescription className="text-alert-description text-sm">
        {description}
        {dismissable && (
          <X
            className="absolute right-4 top-4 h-5 w-5 cursor-pointer text-neutral-500 dark:text-neutral-400"
            onClick={onDismiss}
            aria-label="Dismiss alert"
          />
        )}
      </AlertDescription>
    </ShadAlert>
  );
};

export { Alert, alertVariants };
