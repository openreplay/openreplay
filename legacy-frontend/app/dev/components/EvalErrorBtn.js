import React from 'react';

function throwEvalError() {
	eval('var a = [];a[100].doSomething()');
}

export default function EvalErrorBtn() {
  return (
  	<button 
  		onClick={throwEvalError}
  		style={{background:'teal', color: 'white' }}
  	>
  		{"Make Eval Error"}
  	</button>
  );
}