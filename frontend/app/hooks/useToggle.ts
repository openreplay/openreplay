import { useState, useCallback } from 'react';

export default function useToggle(defaultValue: boolean = false): [ boolean, () => void,  () => void, () => void ] {
	const [ value, setValue ] = useState(defaultValue);
  const toggle = useCallback(() => setValue(d => !d), []);
	const setFalse = useCallback(() => setValue(false), []);
	const setTrue = useCallback(() => setValue(true), []);
	return [ value, toggle, setFalse, setTrue ];
}