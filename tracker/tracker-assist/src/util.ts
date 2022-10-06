/* eslint-disable prefer-rest-params */
const handlers = Symbol('handlers')

export type ProxyResult<T extends Record<any, any>> = T & {
	observe: (handler: (key: string, value: any) => any) => void
  // @ts-ignore
	[key: typeof handlers]: (() => void)[]
}

export function makeObservable<T extends Record<any, any>>(target: T): ProxyResult<T> {
	// @ts-ignore
	target[handlers] = []

	// @ts-ignore
	target.observe = function (handler) {
    // @ts-ignore
		this[handlers].push(handler)
	}

	// @ts-ignore
	return new Proxy(target, {
		set(target, property, value) {
			// @ts-ignore
			const success = Reflect.set(...arguments)
			if (success) {
				// @ts-ignore
				target[handlers].forEach((handler: (property: string, value: any) => void) => handler(property, value))
			}
			return success
		},
	})
}
