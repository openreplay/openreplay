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
	return
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
			return this.level === WARNING || WARN;
		}
	}
});

interface ILog {
  level: string
  value: string
  time: number
  index?: number
  errorId?: string
}

export const Log = (log: ILog) => ({
  isRed: () => log.level === EXCEPTION || log.level === ERROR,
  isYellow: () => log.level === WARNING || log.level === WARN,
  ...log
})
