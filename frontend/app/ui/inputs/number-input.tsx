import { cn } from '@/lib/utils';

import { Input, type InputProps } from './input';

export interface NumberInputProps extends Omit<
  InputProps,
  'value' | 'onChange' | 'type' | 'min' | 'max'
> {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  className,
  ...props
}: NumberInputProps) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      data-slot="input"
      value={value ?? ''}
      min={min}
      max={max}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') return onChange(undefined);
        const n = Number(raw);
        if (Number.isNaN(n)) return;
        onChange(
          min != null && n < min ? min : max != null && n > max ? max : n,
        );
      }}
      className={cn(
        'font-num tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        className,
      )}
      {...props}
    />
  );
}
