import React from 'react';
import { Input } from 'antd';

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
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <Input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
      />
      {errors && <div className="text-red-500 text-xs mt-1">{errors}</div>}
    </div>
  );
}
export default FormField;
