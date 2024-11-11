import type { InputProps as ShadInputProps } from "@/shadcn-components/input";
import { Input as ShadInput } from "@/shadcn-components/input";
import type { LabelProps } from "../label/label";
import Label from "../label/label";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

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
      "bg-input-bg-color dark:focus:border-custom-primary w-full border border-neutral-300 p-4 pr-10 text-sm placeholder-zinc-400 ring-0 placeholder:text-sm placeholder:font-normal focus:border-2 focus:border-blue-500 focus-visible:ring-transparent focus-visible:ring-offset-0 dark:border-white/20",
      className,
      hasError &&
        "dark:border-bright-red-100 dark:focus:border-bright-red-100 border-red-500 hover:border-red-700 focus:border-red-500 focus-visible:ring-offset-0",
      inputIcon && "pl-8",
    ),
    ...(register ? { ...register } : {}),
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <Label {...labelProps} />}
      <ShadInput type={props.type} {...inputProps} />
    </div>
  );
};

export default Input;
