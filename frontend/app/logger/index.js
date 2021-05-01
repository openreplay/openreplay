import { options } from 'App/dev/console';

function log(...args) {
	if (!window.ENV.PRODUCTION || options.logStuff) {
		console.log(...args);
	}
}

function warn(...args) {
	if (!window.ENV.PRODUCTION || options.logStuff) {
		console.warn(...args);
	}
}

function error(...args) {
	if (!window.ENV.PRODUCTION || options.logStuff) {
		console.error(...args);
	}
}


export default {
	info: log,
	log,
	warn,
	error,
}