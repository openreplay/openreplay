import React, { useState, useCallback } from 'react';
import InlineInput from './InlineInput';
import stl from './inspector.css'

interface Props {
  attr: Attr;
  forceUpdateElement: () => void;
}

export default function AttrView({ attr, forceUpdateElement }: Props) {
	const [ editing, setEditing ] = useState(false);
	const commit = useCallback((text: string) => {
		setEditing(false);
		if (!attr.ownerElement) { return; }
		if (text.trim() === "") {
      attr.ownerElement.removeAttribute(attr.name);
      forceUpdateElement();
      return;
		}
		const parts = text.split("=");
		if (parts.length != 2) { return; }

		const trimRE = /^['"`\d\s\uFEFF\xA0]+|['"`\s\uFEFF\xA0]+$/g
		const name = parts[0].replace(trimRE, '');
		if (!/^[A-Za-z0-9:-]+$/.test(name)) { return; }

		let value = parts[1];
		if (value[0] === value[ value.length - 1 ] && "\'\"".includes(value[0])) {
			value = value.slice(1, value.length - 1);
		}
		if (value.includes('"')) { return; } 

		if (name !== attr.name) {
			attr.ownerElement.removeAttribute(name);
		}
		attr.ownerElement.setAttribute(name, value);
		forceUpdateElement();
	}, []);

	return editing 
		? <InlineInput 
				value={ `${ attr.name }="${ attr.value }"` } 
				commit={ commit }
				className="ml-2"
			/>
		: <span className="ml-2" onDoubleClick={ () => setEditing(true) }>
				<span className={stl.attributeName}>{attr.name}</span>
				{'='}
				{'"'}<span className={stl.attributeValue}>{attr.value}</span>{'"'}
			</span>
	;
}