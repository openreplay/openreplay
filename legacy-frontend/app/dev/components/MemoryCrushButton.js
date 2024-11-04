import React from 'react';
import appStore from 'App/store';

function doHeavyStuffAAAA() {
	let superHeavyString = "";
	for (var i = 0; i < 100000; i++) {
		superHeavyString += JSON.stringify(appStore.getState())
	}
}

export default function MemoryCrushButton() {
  return (
  	<button  
	  	style={{background:'darkgreen', color: 'purple'}} 
	  	onClick={doHeavyStuffAAAA}
	  >
	  	{"Eat Memory" }
  	</button>
  );
}