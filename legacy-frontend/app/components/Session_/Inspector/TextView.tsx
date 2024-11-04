import React from 'react';
import InlineInput from './InlineInput';

interface Props {
	text: Text;
}

export default function TextView({ text }: Props) {
	const commit = (value) => { text.nodeValue = value; }
	return (
		<InlineInput 
			value={ text.nodeValue || "" }
			commit={ commit }
		/>
	);
}