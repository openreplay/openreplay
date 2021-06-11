import React, { useEffect, useState, useRef } from 'react';
import { toggleInspectorMode, markElement } from 'Player';
import ElementView from './ElementView';
import BottomBlock from '../BottomBlock';
import stl from './inspector.css'

// TODO: refactor: use Layout from the Sessions and put everything there under the WebPlayer folder

// function onMount(element, setOpen) {  // TODO: through the MobX
//   element.setOpen = setOpen;
// }


export default function Inspector () {
  const [doc, setDoc] = useState(null);
  const [openChain, setOpenChain] = useState([]);
  const [selectedElement, _setSelectedElement] = useState(null);
  const selectedElementRef = useRef(selectedElement);
  const setSelectedElement = elem => {
    selectedElementRef.current = elem;
    _setSelectedElement(elem);
  }

	useEffect(() => {
    const doc = toggleInspectorMode(true, ({ target }) => {
      const openChain = [];
      let currentTarget = target;
      do {
        openChain.unshift(currentTarget);
        currentTarget = currentTarget.parentElement;
      } while (currentTarget !== null);
      setOpenChain(openChain);
      setSelectedElement(target);
    });
    setDoc(doc);
    setOpenChain([ doc.documentElement ]);

    const onKeyPress = e => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const elem = selectedElementRef.current;
        console.log(elem)
        if (elem !== null && elem.parentElement !== null) {
          console.log('a?')
          elem.parentElement.removeChild(elem);
          setSelectedElement(null);
        }
      }
    }
    window.addEventListener("keydown", onKeyPress);
    return () => {
      toggleInspectorMode(false);
      window.removeEventListener("keydown", onKeyPress);
    }
  }, []);

	if  (!doc) return null;
	return (
		<BottomBlock>      
      <BottomBlock.Content>
        <div onMouseLeave={ () => markElement(null) } className={stl.wrapper}>
        	<ElementView 
            element={ doc.documentElement }
            level={0}
            context={doc.defaultView}
            openChain={ openChain }
            selectedElement={ selectedElement }
            setSelectedElement={ setSelectedElement }
            onHover={ markElement }
          />
        </div>
      </BottomBlock.Content>
    </BottomBlock>
	);
}