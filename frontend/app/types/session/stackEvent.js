import Record from 'Types/Record';

export const OPENREPLAY = 'openreplay';
export const SENTRY = 'sentry';
export const DATADOG = 'datadog';
export const STACKDRIVER = 'stackdriver';
export const ROLLBAR = 'rollbar';
export const NEWRELIC = 'newrelic';
export const BUGSNAG = 'bugsnag';
export const CLOUDWATCH = 'cloudwatch';
export const ELASTICSEARCH = 'elasticsearch';
export const SUMOLOGIC = 'sumologic';

export const typeList = [ OPENREPLAY, SENTRY, DATADOG, STACKDRIVER, ROLLBAR, BUGSNAG, CLOUDWATCH, ELASTICSEARCH, SUMOLOGIC ];

export function isRed(event) {
	if (!event.payload) return false;
	switch(event.source) {
		case SENTRY:
			return event.payload['event.type'] === 'error';
		case DATADOG:
			return true;
		case STACKDRIVER:
			return false;
		case ROLLBAR:
			return true;
		case NEWRELIC:
			return true;
		case BUGSNAG:
			return true;
		case CLOUDWATCH:
			return true;
		case SUMOLOGIC:
			return false;
		default: 
			return event.level==='error';
	}
}

export default Record({
	time: undefined,
	index: undefined,
  name: '',
  message: "",
  payload: null,
  source: null,
  level: "",
}, {
	fromJS: ue => ({ 
		...ue,
		source: ue.source || OPENREPLAY, 
	}),
	methods: {
		isRed() {
			return isRed(this);
		}
	}
});

