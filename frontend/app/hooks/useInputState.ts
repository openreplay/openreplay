import React, { useState, useCallback } from 'react';

type SupportedElements = HTMLInputElement | HTMLSelectElement;

export default function(state: string = ""): [string, React.ChangeEventHandler<SupportedElements>, (value: string) => void] {
	const [ value, setValue ] = useState<string>(state);
	const onChange = useCallback(
		({ target: { value } }: React.ChangeEvent<SupportedElements>) =>
		setValue(value),
	[]);
	return [ value, onChange, setValue ];
}
