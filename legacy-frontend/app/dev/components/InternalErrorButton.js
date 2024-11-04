import React from 'react';

function sendWrongEvent() {
	const a = {};
	a.a = a;
}

export default function InternalErrorButton() {
  return (
  	<button 
  		onClick={sendWrongEvent}
  		style={{background:'maroon', color: 'white'}}
  	>
  		{"Crash OpenReplay Tracker"}
  	</button>
  );
}