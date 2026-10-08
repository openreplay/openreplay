import { Plus } from 'lucide-react';

import './example-chip.css';

export function ExampleChip({
  label,
  onTake,
}: {
  label: string;
  onTake: () => void;
}) {
  return (
    <button type="button" className="m-xchip m-hover" onClick={onTake}>
      <Plus size={11} aria-hidden="true" />
      {label}
    </button>
  );
}
