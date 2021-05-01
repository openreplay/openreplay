import Record from 'Types/Record';

export default Record({
  method: '',
	urlHostpath: '',
	allRequests: '',
	'4xx': '',
	'5xx': ''
}, {
	// fromJS: pm => ({
	// 	...pm,
	// }),
});