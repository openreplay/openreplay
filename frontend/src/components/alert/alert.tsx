import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import {
  AlertDescription,
  AlertTitle,
  Alert as ShadAlert,
} from "@/shadcn-components/alert";
import { AlertCircle, Terminal, Info, CheckCircle } from "lucide-react";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        info: "border-info/50 text-info dark:border-info [&>svg]:text-info",
        success:
          "border-success/50 text-success dark:border-success [&>svg]:text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const iconMap = {
  default: Terminal,
  destructive: AlertCircle,
  info: Info,
  success: CheckCircle,
} as const;

type VariantKey = keyof typeof iconMap;

interface IAlertProps
  extends React.HTMLProps<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title: string;
  description: string;
  variant?: VariantKey;
}

const Alert = ({
  className,
  title,
  description,
  variant = "default",
  ...props
}: IAlertProps) => {
  const Icon = iconMap[variant];

  return (
    <ShadAlert className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="h-5 w-5" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </ShadAlert>
  );
};

export { Alert, alertVariants };
