import { Button } from 'antd';
import React from 'react';

/* Selectable reason chip, shared by the hide and remove-critical pickers. */
export default function ReasonChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Button
      size="small"
      type="default"
      onClick={() => onChange(!checked)}
      style={
        checked
          ? {
              background: 'var(--color-active-blue)',
              borderColor: 'var(--color-active-blue-border)',
              color: 'var(--color-teal)',
            }
          : undefined
      }
    >
      {label}
    </Button>
  );
}
