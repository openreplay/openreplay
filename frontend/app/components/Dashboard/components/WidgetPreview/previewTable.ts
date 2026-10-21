import { createContext, useContext } from 'react';

/** The builder preview's data table, driven from the preview's toolbar. */
export interface PreviewTable {
  shown: boolean;
  /** the table registers its CSV export while it is mounted */
  setExport: (fn: (() => void) | null) => void;
}

export const PreviewTableContext = createContext<PreviewTable | null>(null);

export const usePreviewTable = () => useContext(PreviewTableContext);
