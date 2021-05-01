import React, { useState } from 'react';

export default function CrashReactAppButton() {
	const [buttonText, setButtonText] =  useState("Crush The App");
  return (
  	<button  
	  	style={{background:'red', color: 'white',border:"1px solid teal"}} 
	  	onClick={()=>{ setButtonText(undefined)}}
	  >
	  	{`${buttonText} (${buttonText.length})`}
  	</button>
  );
}