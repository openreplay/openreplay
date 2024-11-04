import { useRef, useEffect, useCallback } from 'react'

export default function useIsMounted(): () => boolean {
    const ref = useRef(false);

    useEffect(() => {
        ref.current = true;
        return () => {
        ref.current = false;
        };
    }, []);

    return useCallback(() => ref.current, [ref]);
}
