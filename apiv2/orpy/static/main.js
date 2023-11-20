import * as preact from 'https://unpkg.com/preact?module';

console.log("echo hello world");

let root = document.getElementById('root');
let ws = new WebSocket(`ws://${window.location.host}/`);

function makeEventHandlerCallback(name, uid) {
    return function(event) {
        event.preventDefault();
	let msg = {
	    type: 'dom-event',
	    name: name,
	    uid: uid,
	    path: location.pathname,
	    payload: {'target.value': event.target.value},
	};
	console.log('send', msg);
	ws.send(JSON.stringify(msg));
        return false;
    }
}

// Translate json to preact vdom node 
let TAG = 0;
let PROPERTIES = 1;
let CHILDREN = 2;

function translate(json) {
    // create callbacks
    Object.keys(json[PROPERTIES]).forEach(function(key) {
	// If the key starts with on, it must be an event handler,
	// replace the value with a callback that sends the event
	// to the backend.
	if (key.startsWith('on')) {
	    json[PROPERTIES][key] = makeEventHandlerCallback(key, json[PROPERTIES][key]);
	}
    });

    let children = json[CHILDREN].map(function(child) {
	if (child instanceof Array) {
	    // recurse
	    return translate(child);
	} else { // it's a string or a number
	    return child;
	}
    });

    return preact.h(json[TAG], json[PROPERTIES], children);
}

ws.onmessage = function(msg) {
    msg = JSON.parse(msg.data);
    console.log('onmessage', msg);
    let app = translate(msg);
    preact.render(app, root);
    let input = document.querySelector("#input");
    input.scrollIntoView();
    input.focus();
}

ws.onopen = function (_) {
    let msg = {
	type: 'init',
	path: location.pathname,
    };
    console.log(msg);
    ws.send(JSON.stringify(msg));
};

ws.onclose = function (_) {
    window.location.reload();
};

document.addEventListener('keyup', (event) => {
    const keyName = event.key;

    if (keyName === '/' && event.ctrlKey) {
        let input = document.querySelector("#input");
        input.scrollIntoView();
        input.focus();
    }
}, false);
