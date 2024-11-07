import { cn } from "@/lib/utils";
import React, { useState } from "react";

type RadioProps = {
  title: string;
  description: string;
  disabled?: boolean;
};

const Radio = ({ title, description, disabled = false }: RadioProps) => {
  const [checked, setChecked] = useState(false);

  const handleCheck = () => {
    if (!disabled) {
      setChecked(!checked);
    }
  };

  return (
    <div
      onClick={handleCheck}
      className={cn(
        "relative flex select-none items-start space-x-2 py-2",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <span
        className={cn(
          "relative mt-1 flex h-4 min-h-4 w-4 min-w-4 items-center justify-center rounded-full border transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          checked && !disabled
            ? "border-primary bg-primary"
            : "border-neutral-300 bg-primary-foreground",
          disabled && "border-neutral-200 bg-neutral-100",
        )}
      >
        {checked && !disabled && (
          <span className="h-2 w-2 rounded-full bg-primary-foreground"></span>
        )}
      </span>
      <div>
        <span className="font-medium">{title}</span>
        <p className="text-secondary-text text-sm">{description}</p>
      </div>
    </div>
  );
};

export default Radio;
