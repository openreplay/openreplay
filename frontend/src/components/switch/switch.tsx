import { Switch as ShadSwitch } from "@/shadcn-components/switch";
import Label from "../label/label";
import { cn } from "@/lib/utils";

type SwitchProps = {
  id?: string;
  label?: string;
  className?: string;
};

const Switch = ({ id, label, className }: SwitchProps) => {
  return (
    <div className="flex items-center gap-2">
      <ShadSwitch className={cn("", className)} id={id} />
      {label && (
        <Label className="text-base font-medium" label={label} htmlFor={id} />
      )}
    </div>
  );
};

export default Switch;
