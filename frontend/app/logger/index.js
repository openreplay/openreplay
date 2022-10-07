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

let groupTm = null;

	function group(...args) {
	if (!window.env.PRODUCTION || options.verbose) {
		if (!groupTm) {
			groupTm = setTimeout(() => console.groupEnd(), 500)
			console.groupCollapsed('Openreplay: Skipping session messages')
		}
		console.log(...args);
	}
}


export default {
	info: log,
	log,
	warn,
	error,
	group,
}
