import { useMemo } from 'react'
import { CellMeasurerCache } from 'react-virtualized';
import useLatestRef from 'App/hooks/useLatestRef'


export default function useCellMeasurerCache(itemList: any[]) {
	const filteredListRef = useLatestRef(itemList)
  return useMemo(() => new CellMeasurerCache({
    fixedWidth: true,
    keyMapper: (index) => filteredListRef.current[index],
  }), [])
}