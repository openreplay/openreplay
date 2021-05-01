import React from 'react';

export default function EventErrorButton() {
  return (
  	<button 
  		onClick={()=>{ thingThatShouldNotBeDefined.unexistingProperty['0']() }}
  		style={{background:'orange', color: 'white',border:"1px solid teal"}}
  	>
  		{"Make Event Error"}
  	</button>
  );
}