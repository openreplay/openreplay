import '@/ui/overlays/dialogs.css';
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
    <button
      type="button"
      className={`m-dlg__reason${checked ? ' is-on' : ''}`}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      {label}
    </button>
  );
}
