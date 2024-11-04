import React, { useEffect, useState } from 'react';
import cn from 'classnames';
import useToggle from 'App/hooks/useToggle';
import useForceUpdate from 'App/hooks/useForceUpdate';
import { Icon } from 'UI';
import stl from './inspector.module.css';

import AttrView from './AttrView';
import TextView from './TextView';
import InlineInput from './InlineInput';



//TODO: add attribute, add child, add text (when there was no text before), Ctrl+Z 

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
  selectedElement?: Element; // for deletion and other things
  setSelectedElement?: (Element) => void;
  onHover?: (Element) => void;
  className?: String
}

interface TagEditorProps {
	element: Element;
	forceUpdateParent: () => void;
	context: Window; 
}


// TODO: to common space
function stopPropagation(cb: Function): React.MouseEventHandler {
	return function(e) {
		e.stopPropagation();
		cb();
	}
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
				className={stl.tag}
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
	selectedElement,
	setSelectedElement,
	onHover,
  className
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
	const isSelected = selectedElement === element;
	const selectElement = setSelectedElement 
		? stopPropagation(() => setSelectedElement(element))
		: undefined;
	const onMouseOver = onHover 
		? stopPropagation(() => onHover(element))
		: undefined;
	return (
		<div 
			className={ cn("font-mono", className, { // todo: only in root
				[stl.bgHighlight]: !open && isSelected,
				"hover:bg-gray-light": !open && !isSelected,
			})}
			style={{ fontSize: '12px' }}
			onMouseOver={ onMouseOver }
		>
			<span 
				className={cn({ 
					"block": open,
					[stl.bgHighlight]: open && isSelected,
					"hover:bg-gray-light": open && !isSelected,
				})}
			>
				<span role="button mr-1" onClick={toggleOpen}>
					<Icon inline name={open ? "caret-down-fill" : "caret-right-fill" }/>
				</span>
				<span onClick={ selectElement }>
					<span className={stl.tag}>{'<'}</span>
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
					<span className={stl.tag}>{'>'}</span>
				</span>
			</span>
			{ open 
				? 
				<>
					{Array.from(element.childNodes).map(child => {
						if (child instanceof context.Element) {
							return (
								<ElementView
									element={ child }
									context={ context }
									forceUpdateParent={ forceUpdate }
									level={ level+1 }
									openChain={ openChain }
									selectedElement={ selectedElement }
									setSelectedElement={ setSelectedElement }
									onHover={ onHover }
									className="pl-4"
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
				</>
				: '...'
			}
			<span className={stl.tag}>{'</'}{ tag }{'>'}</span>
		</div>
	);

}