export function timestamp(): number {
  return Math.round(performance.now()) + performance.timing.navigationStart;
}

export const stars: (str: string) => string =
  'repeat' in String.prototype
    ? (str: string): string => '*'.repeat(str.length)
    : (str: string): string => str.replace(/./g, '*');

export function normSpaces(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

// isAbsoluteUrl regexp:  /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url)
export function isURL(s: string): boolean {
  return s.substr(0, 8) === 'https://' || s.substr(0, 7) === 'http://';
}

export const IN_BROWSER = !(typeof window === "undefined");

export const log = console.log
export const warn = console.warn

export const DOCS_HOST = 'https://docs.openreplay.com';

const warnedFeatures: { [key: string]: boolean; } = {};
export function deprecationWarn(nameOfFeature: string, useInstead: string, docsPath: string = "/"): void {
	if (warnedFeatures[ nameOfFeature ]) {
		return;
	}
	warn(`OpenReplay: ${ nameOfFeature } is deprecated. ${ useInstead ? `Please, use ${ useInstead } instead.` : "" } Visit ${DOCS_HOST}${docsPath} for more information.`)
	warnedFeatures[ nameOfFeature ] = true;
}

export function getLabelAttribute(e: Element): string | null {
	let value = e.getAttribute("data-openreplay-label");
	if (value !== null) {
		return value;
	}
	value = e.getAttribute("data-asayer-label");
	if (value !== null) {
		deprecationWarn(`"data-asayer-label" attribute`, `"data-openreplay-label" attribute`, "/");
	}
	return value;
}

export function hasOpenreplayAttribute(e: Element, name: string): boolean {
	const newName = `data-openreplay-${name}`;
	if (e.hasAttribute(newName)) {
		return true
	}
	const oldName = `data-asayer-${name}`;
	if (e.hasAttribute(oldName)) {
		deprecationWarn(`"${oldName}" attribute`, `"${newName}" attribute`, "/installation/sanitize-data");
		return true;
	}
	return false;
}


