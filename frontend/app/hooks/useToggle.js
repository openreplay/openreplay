import { useState, useCallback } from 'react';

export default function useToggle(defaultValue = false) {
	const [ value, setValue ] = useState(defaultValue);
  const toggle = useCallback(() => setValue(d => !d), []);
	const setFalse = useCallback(() => setValue(false), []);
	return [ value, toggle, setFalse ];
}