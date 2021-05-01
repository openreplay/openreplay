import origMoment from 'moment';
import { extendMoment } from 'moment-range';
import Record from 'Types/Record';
const moment = extendMoment(origMoment);

export const LAST_30_MINUTES = 'LAST_30_MINUTES';
export const TODAY = 'TODAY';
export const LAST_24_HOURS = 'LAST_24_HOURS';
export const YESTERDAY = 'YESTERDAY';
export const LAST_7_DAYS = 'LAST_7_DAYS';
export const LAST_30_DAYS = 'LAST_30_DAYS';
export const THIS_MONTH = 'THIS_MONTH';
export const LAST_MONTH = 'LAST_MONTH';
export const THIS_YEAR = 'THIS_YEAR';
export const CUSTOM_RANGE = 'CUSTOM_RANGE';

const RANGE_LABELS = {
	[ LAST_30_MINUTES ]: 'Last 30 Minutes',
  [ TODAY ]: 'Today',
  [ YESTERDAY ]: 'Yesterday',
  [ LAST_24_HOURS ]: 'Last 24 Hours',
  [ LAST_7_DAYS ]: 'Last 7 Days',
  [ LAST_30_DAYS ]: 'Last 30 Days',
  [ THIS_MONTH ]: 'This Month',
  [ LAST_MONTH ]: 'Last Month',
  [ THIS_YEAR ]: 'This Year',
}

function getRange(rangeName) {
	switch (rangeName) {
    case TODAY:
      return moment.range(
        moment().startOf('day'),
        moment().endOf('day'),
      );
    case YESTERDAY:
      return moment.range(
        moment().subtract(1, 'days').startOf('day'),
        moment().subtract(1, 'days').endOf('day'),
      );
    case LAST_24_HOURS: 
    	return moment.range(
    		moment().startOf('hour').subtract(24, 'hours'),
    		moment().startOf('hour'),
    	);
    case LAST_30_MINUTES:
    	return moment.range(
    		moment().startOf('hour').subtract(30, 'minutes'),
    		moment().startOf('hour'),
    	);
    case LAST_7_DAYS:
      return moment.range(
        moment().subtract(7, 'days').startOf('day'),
        moment().endOf('day'),
      );
    case LAST_30_DAYS:
      return moment.range(
        moment().subtract(30, 'days').startOf('day'),
        moment().endOf('day'),
      );
    case THIS_MONTH:
      return moment().range('month');
    case LAST_MONTH:
      return moment().subtract(1, 'months').range('month');
    case THIS_YEAR:
      return moment().range('year');
    default:
    	return moment.range();
  }
}

export default Record({
	start: 0,
	end: 0,
	rangeName: CUSTOM_RANGE,
	range: moment.range(),
}, {
	fromJS: period => {
		if (!period.rangeName || period.rangeName === CUSTOM_RANGE) {
			const range = moment.range(
				moment(period.start || 0),
				moment(period.end || 0),
			);
			return {
				...period,
				range,
				start: range.start.unix() * 1000,
	  		end: range.end.unix() * 1000,
			};
		}
		const range = getRange(period.rangeName);
	  return {
	  	...period,
	  	range,
	  	start: range.start.unix() * 1000,
	  	end: range.end.unix() * 1000,
	  }
	},
	methods: {
		toTimestamps() {
			return {
				startTimestamp: this.start,
				endTimestamp: this.end,
			};
		},
	}
});