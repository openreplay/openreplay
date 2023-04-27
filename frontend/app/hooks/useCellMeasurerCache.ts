import { useMemo } from 'react'
import { CellMeasurerCache, CellMeasurerCacheParams } from 'react-virtualized';

export default function useCellMeasurerCache(options?: CellMeasurerCacheParams) {
  return useMemo(() => new CellMeasurerCache({
    fixedWidth: true,
    ...options
  }), [])
}