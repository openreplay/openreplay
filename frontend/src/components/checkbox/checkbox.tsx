import { Checkbox as ShadCheckbox } from "@/shadcn-components/checkbox";

import useUniqueId from "@/hooks/use-unique-id";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
};

const Checkbox = ({
  label,
  description,
  disabled,
  className,
}: CheckboxProps) => {
  const checkboxId = useUniqueId();
  return (
    <div className="flex items-start justify-start gap-2">
      <ShadCheckbox
        disabled={disabled}
        id={checkboxId[0]}
        className={cn(
          "mt-0.5 h-4 w-4 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          className,
        )}
      />
      {label && (
        <div className={cn("flex flex-col gap-1", disabled && "text-zinc-400")}>
          <label htmlFor={checkboxId[0]} className="text-sm font-medium">
            {label}
          </label>
          <p
            className={cn(
              "text-secondary-text text-sm font-normal",
              disabled && "text-zinc-400",
            )}
          >
            {description}
          </p>
        </div>
      )}
    </div>
  );
};

export default Checkbox;
