import { ArrowUp } from 'lucide-react';

import './new-rows-band.css';

/** "Show N new …" between a list's head and its rows, in the flow. */
export function NewRowsBand({
  count,
  label,
  onShow,
  stickyTop,
}: {
  count: number;
  label: string;
  onShow: () => void;
  /** pins the band under a sticky head row */
  stickyTop?: string;
}) {
  if (count <= 0) return null;
  return (
    <button
      type="button"
      className={`m-newrows${stickyTop ? ' is-sticky' : ''}`}
      style={stickyTop ? { top: stickyTop } : undefined}
      onClick={onShow}
    >
      <ArrowUp size={13} aria-hidden="true" />
      {label}
    </button>
  );
}
