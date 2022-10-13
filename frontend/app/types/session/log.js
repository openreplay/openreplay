import Record from 'Types/Record';

export const INFO = 'info';
export const LOG = 'log';
export const WARNING = 'warning';
export const WARN = 'warn';
export const ERROR = 'error';
export const EXCEPTION = 'exception';
export const LEVEL = {
  INFO,
  LOG,
  WARNING,
  WARN,
  ERROR,
  EXCEPTION,
}

export function isRed(log) {
	return log.level === EXCEPTION || log.level === ERROR;
}

export default Record({
  level: '',
  value: '',
  time: undefined,
  index: undefined,
  errorId: undefined,
}, {
	methods: {
		isRed() {
			return isRed(this);
		},
		isYellow() {
			return this.level === WARNING;
		}
	}
});


