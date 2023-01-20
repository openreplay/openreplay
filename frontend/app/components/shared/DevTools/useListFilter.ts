import { useMemo } from 'react'
import { getRE } from 'App/utils'


// TODO: merge with utils/filterList (use logic of string getter like here instead of using callback)
export function useRegExListFilterMemo<T>(
	list: T[],
	filterBy: (it: T) => string | string[],
	reText: string,
) {
	return useMemo(() => {
		if (!reText) { return list }
		const re = getRE(reText, 'i')
    return list.filter(it => {
    	const strs = filterBy(it)
    	return Array.isArray(strs)
	    	? strs.some(s => re.test(s))
	    	: re.test(strs)
	  })
  }, [ list, list.length, reText ])
}


export function useTabListFilterMemo<T, Tab=string>(
	list: T[],
	itemToTab: (it: T) => Tab,
	commonTab: Tab,
	currentTab: Tab,
) {
	return useMemo(() => {
		if (currentTab === commonTab) { return list }
		return list.filter(it => itemToTab(it) === currentTab)
	}, [ list, list.length, currentTab ])
}