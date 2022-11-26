import { useMemo } from 'react'
import { getRE } from 'App/utils'

export function useRegExListFilterMemo<T>(list: T[], filterBy: (item: T) => string, reText: string) {
	return useMemo(() => {
		if (!reText) { return list }
		const re = getRE(reText, 'i')
    list.filter(it => re.test(filterBy(it)))
  }, [ list, list.length, reText ])
}

export function useTabListFilterMemo<T>(
	list: T[],
	itemToTab: (item: T) => string,
	commonTab: string,
	currentTab: string,
) {
	return useMemo(() => {
		if (currentTab === commonTab) { return list }
		return list.filter(it => itemToTab(it) === currentTab)
	}, [ list, list.length, currentTab ])
}