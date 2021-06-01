import React, { useEffect, useState } from 'react';
import useToggle from 'App/hooks/useToggle';
import useForceUpdate from 'App/hooks/useForceUpdate';
import { Icon } from 'UI';

import AttrView from './AttrView';
import TextView from './TextView';
import InlineInput from './InlineInput';


 interface Window {
  Element: typeof Element;
  Text: typeof Text;
  document: typeof document;
}

interface Props {
  element: Element;
  level: number;
  context?: Window; 
  openChain: Element[];
  forceUpdateParent: () => void;
  //selectedElement?: Element; // for deletion and other things
  //setSelectedElement: (Element) => void;
}

interface TagEditorProps {
	element: Element;
	forceUpdateParent: () => void;
	context: Window; 
}

const RESTRICTED_TAGS = ['html', 'body', 'head'];
function TagEditor({ element, forceUpdateParent, context }: TagEditorProps) {
	const [ editing, setEditing ] = useState(false);
	const commitTag = (newTag: string) => {
		if (newTag !== '' && 
			!RESTRICTED_TAGS.includes(newTag) && 
			element.parentNode && 
			/^[a-zA-Z]+$/.test(newTag) // TODO: sync with spec
		) {
			const rElem = context.document.createElement(newTag);
			rElem.innerHTML = element.innerHTML;
			Array.from(element.attributes).forEach(attr => {
				rElem.setAttribute(attr.name, attr.value);
			})
			element.parentNode.replaceChild(rElem, element);
		}
		setEditing(false);
		forceUpdateParent();
	}

	const tag = element.tagName.toLowerCase();
	return editing && !RESTRICTED_TAGS.includes(tag) 
		? <InlineInput value={ tag } commit={ commitTag } />
		: <span 
				onDoubleClick={ 
					RESTRICTED_TAGS.includes(tag) 
						? undefined 
						: () => setEditing(true) }
			>{ tag }</span>
		;
}

//const IGNORE_CLASSES = [ "-openreplay-hover" ];


export default function ElementView({ 
	element,
	level,
	context = window,
	openChain,
	forceUpdateParent,
}: Props) {
	const [ open, toggleOpen, _, setOpen ] = useToggle(false);

	// useEffect(() => { // TODO: common. something like onElementMount
	// 	IGNORE_CLASSES.forEach(cls => element.classList.remove(cls));
	// 	if (element.classList.length === 0) {
	// 		element.removeAttribute("class");	
	// 	}
	// }, [])

	useEffect(() => {
		if (openChain[ level ] === element) {
			setOpen();
		}
	}, [ openChain[ level ] ]);
	const forceUpdate = useForceUpdate();

	const tag = element.tagName.toLowerCase();
	return (
		<div className="font-mono" >
			<span role="button" onClick={toggleOpen}><Icon inline name={open ? "arrow-down" : "arrow-square-left" }/></span>
			{'<'}
			<TagEditor 
				element={ element }
				context={ context }
				forceUpdateParent={ forceUpdateParent }
			/>
			{ Array.from(element.attributes).map(attr => 
				<AttrView 
					attr={ attr }
					forceUpdateElement={ forceUpdate }
				/>
			)}
			{'>'}
			{ open 
				? 
				<div className={`pl-${level}`}>
					{Array.from(element.childNodes).map(child => {
						if (child instanceof context.Element) {
							return (
								<ElementView
									element={ child }
									context={ context }
									forceUpdateParent={ forceUpdate }
									level={ level+1 }
									openChain={ openChain }
								/>
							);
						} else if (child instanceof context.Text) {
							if (!child.nodeValue || child.nodeValue.trim() === "") {
								return null;
							}
							return <TextView text={ child } />
						}
						return null;
					})}
				</div>
				: '...'
			}
			{'<'}{ tag }{'/>'}
		</div>
	);

}