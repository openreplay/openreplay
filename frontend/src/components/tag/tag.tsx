import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../button/button";

type TagProps = {
  label: string;
  count?: number;
  dissmissable?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  onRemove?: () => void;
};

const Tag = ({
  label,
  count,
  dissmissable = false,
  disabled = false,
  icon,
  className,
  onRemove,
}: TagProps) => {
  return (
    <div
      className={cn(
        "hover:bg-tag-hover dark:hover:border-tag-hover flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
      )}
    >
      {icon && <span className="text-secondary-text">{icon}</span>}
      <span>{label}</span>

      {count !== undefined && (
        <span className="bg-tag-hover flex h-5 w-5 items-center justify-center rounded-md border px-1.5 text-xs text-secondary-text">
          {count}
        </span>
      )}

      {dissmissable && (
        <span
          className="flex cursor-pointer items-center justify-center"
          onClick={() => {
            if (onRemove) onRemove();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
};

export default Tag;
