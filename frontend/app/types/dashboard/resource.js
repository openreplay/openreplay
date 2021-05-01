import Record from 'Types/Record';

const getName = (url = '') => url.split('/').filter(part => !!part).pop();

export default Record({
  avgDuration: undefined,
  sessions: undefined,
  chart: [],
  url: '',
  name: '',
}, {
	fromJS: (resource) => ({
		...resource,
		name: getName(resource.url),
	})
});
