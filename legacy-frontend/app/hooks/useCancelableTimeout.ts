import { useRef, useEffect } from 'react'


export default function useCancelableTimeout(
	onTimeout: ()=> void,
	onCancel: ()=> void,
	delay: number,
): [()=> void, ()=> void] {
	const idRef = useRef<ReturnType<typeof setTimeout>>()
	const triggerTimeout = () => {
		clearTimeout(idRef.current)
		idRef.current = setTimeout(onTimeout, delay)
	}
	const cancelTimeout = () => {
		clearTimeout(idRef.current)
		onCancel()
	}
	useEffect(() => () => clearTimeout(idRef.current), []) // auto-cancel without callback (on clean)
	return [ triggerTimeout, cancelTimeout ]
}