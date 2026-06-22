import { Button } from 'antd';
import React from 'react';

/* Selectable reason chip — an antd small Button that toggles default (gray) →
   muted active-blue (selected). Shared by the hide and remove-critical pickers
   (the muted state must not compete with the primary CTA). */
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
