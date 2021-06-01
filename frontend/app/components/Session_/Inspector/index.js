import React, { useEffect, useState } from 'react';
import { toggleInspectorMode } from 'Player';
import ElementView from './ElementView';
import BottomBlock from '../BottomBlock';

// TODO: refactor: use Layout from the Sessions and put everything there under the WebPlayer folder

// function onMount(element, setOpen) {  // TODO: through the MobX
//   element.setOpen = setOpen;
// }


export default function Inspector () {
  const [doc, setDoc] = useState(null);
  const [openChain, setOpenChain] = useState([]);
	useEffect(() => {
    const doc = toggleInspectorMode(true, ({ target }) => {
      const openChain = [ target ];
      while (target.parentElement !== null) {
        target = target.parentElement;
        openChain.unshift(target);
      }
      setOpenChain(openChain);
    });
    setDoc(doc);
    setOpenChain([ doc.documentElement ]);
    return () => toggleInspectorMode(false);
  }, []);

	if  (!doc) return null;
	return (
		<BottomBlock>
      {/* <BottomBlock.Header> */}
      {/* </BottomBlock.Header> */}
      <BottomBlock.Content>
      	<ElementView element={ doc.documentElement } level={0} context={doc.defaultView} openChain={ openChain } />
      </BottomBlock.Content>
    </BottomBlock>
	);
}