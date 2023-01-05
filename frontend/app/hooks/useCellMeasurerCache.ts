import { useMemo } from 'react'
import { CellMeasurerCache, CellMeasurerCacheParams } from 'react-virtualized';
import useLatestRef from 'App/hooks/useLatestRef'

export default function useCellMeasurerCache(itemList?: any[], options?: CellMeasurerCacheParams) {
	const filteredListRef = itemList ? useLatestRef(itemList) : undefined
  return useMemo(() => new CellMeasurerCache({
    fixedWidth: true,
    keyMapper: filteredListRef ? (index) => filteredListRef.current[index] : undefined,
    ...options
  }), [])
}