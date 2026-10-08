import { Input } from '@/ui/inputs/input';
import React from 'react';

export function FormField({
  label,
  name,
  value,
  onChange,
  autoFocus,
  errors,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  errors?: string;
}) {
  return (
    <div className="m-dfield mb-4">
      <label className="m-dfield__label" htmlFor={`if-${name}`}>
        {label}
      </label>
      <Input
        id={`if-${name}`}
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        aria-invalid={!!errors}
      />
      {errors && <div className="text-xs text-content-danger">{errors}</div>}
    </div>
  );
}
export default FormField;
