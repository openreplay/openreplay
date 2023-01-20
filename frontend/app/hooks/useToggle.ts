import { useState } from 'react';

export default function useToggle(defaultValue: boolean = false): [ boolean, () => void,  () => void, () => void ] {
	const [ value, setValue ] = useState(defaultValue);
  const toggle = () => setValue(d => !d)
	const setFalse = () => setValue(false)
	const setTrue = () => setValue(true)
	return [ value, toggle, setFalse, setTrue ];
}