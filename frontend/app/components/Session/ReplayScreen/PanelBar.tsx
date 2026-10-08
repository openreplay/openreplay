import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import type { ReactNode } from 'react';

import './side-panel.css';

export interface PanelBarProps {
  /** A find over the list below; given, the whole bar is the field. */
  find?: { value: string; onChange: (v: string) => void; placeholder: string };
  /** What the tab shows when there is nothing to find ("4 comments"). */
  note?: ReactNode;
  /** Icon verbs at the end. */
  children?: ReactNode;
}

/** The head every side-panel tab wears: a find or a note on the left, icon verbs on the right, one height. */
export function PanelBar({ find, note, children }: PanelBarProps) {
  const acts = children ? (
    <span className="m-spanel__acts">{children}</span>
  ) : undefined;
  if (find) {
    return (
      <PopoverSearch
        className="m-spanel__bar"
        autoFocus={false}
        placeholder={find.placeholder}
        value={find.value}
        onChange={find.onChange}
        trailing={acts}
      />
    );
  }
  return (
    <div className="m-spanel__bar">
      <span className="m-spanel__note">{note}</span>
      {acts}
    </div>
  );
}
