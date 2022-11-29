
export function number(key: string, dflt = 0): number {
	const stVal = localStorage.getItem(key)
	if (stVal === null) {
		return dflt
	}
	const val = parseInt(stVal)
	if (isNaN(val)) {
		return dflt
	}
	return val
}

export function boolean(key: string, dflt = false): boolean {
	return localStorage.getItem(key) === "true"
}
export function string(key: string, dflt = ''): string {
	return localStorage.getItem(key) || ''
}