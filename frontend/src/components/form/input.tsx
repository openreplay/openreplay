import type { InputProps as ShadInputProps } from "@/shadcn-components/input";
import { Input as ShadInput } from "@/shadcn-components/input";
import type { LabelProps } from "../label/label";
import Label from "../label/label";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";

interface InputComponentProps {
  error?: string;
  inputIcon?: React.ReactNode;
  register?: UseFormRegisterReturn;
}

type InputProps = InputComponentProps & ShadInputProps & LabelProps;

const Input: React.FC<InputProps> = ({
  label,
  className,
  error,
  inputIcon,
  register,
  wrapperClassName,
  helperText,
  required,
  icon,
  badge,
  badgeVariant,
  ...props
}) => {
  const hasError = !!error;

  const labelProps: LabelProps = {
    label,
    wrapperClassName,
    helperText,
    required,
    icon,
    badge,
    badgeVariant,
  };
  const inputProps: ShadInputProps = {
    ...props,
    className: cn(
      "bg-input-background w-full border border-input-border p-4 pr-10 text-sm placeholder-input-placeholder placeholder:text-sm placeholder:font-normal disabled:bg-neutral-100 dark:disabled:bg-input-background ",
      className,
      hasError && "border-destructive",
      inputIcon && "pl-9",
    ),
    ...(register ? { ...register } : {}),
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <Label {...labelProps} />}
      <div className="relative">
        <ShadInput type={props.type} {...inputProps} />
        {inputIcon && (
          <div className="text-input-placeholder absolute inset-y-0 left-0 flex items-center pl-3">
            {inputIcon}
          </div>
        )}
      </div>
      {hasError && (
        <p className="flex items-center gap-1 text-sm font-semibold text-destructive">
          <TriangleAlert className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
