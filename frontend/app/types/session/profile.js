import { List } from 'immutable';
import Record from 'Types/Record';

export default Record({
  name: '',
  args: List(),
  result: undefined,
  time: undefined,
  index: undefined,
  duration: undefined,
}, {
	fromJS: ({ start_time, end_time, args, ...profile }) => ({
		...profile,
		args: List(args),
		time: Math.round(start_time),
		duration: Math.round(end_time - start_time || 0),
	}),
});


