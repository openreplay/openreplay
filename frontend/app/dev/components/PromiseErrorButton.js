import React from 'react';

function fetchWrong() {
	return fetch('/lalka_sasai').then(resp => resp.json());
}

export default function PromiseErrorButton() {
  return (
  	<button 
  		onClick={fetchWrong}
  		style={{background:'purple', color: 'white'}}
  	>
  		{"Zatrollit' lalku"}
  	</button>
  );
}