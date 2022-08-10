import { options } from 'App/dev/console';

function log(...args) {
	if (options.verbose) {
		console.log(...args);
	}
}

function warn(...args) {
	if (!window.env.PRODUCTION || options.verbose) {
		console.warn(...args);
	}
}

function error(...args) {
	if (!window.env.PRODUCTION || options.verbose) {
		console.error(...args);
	}
}


export default {
	info: log,
	log,
	warn,
	error,
}
