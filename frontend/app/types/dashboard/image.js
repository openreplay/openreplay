import Record from 'Types/Record';

const getName = (url = '') => url.split('/').filter(part => !!part).pop();

export default Record({
  avgDuration: undefined,
  sessions: undefined,
  chart: [],
  url: '',
  name: '',
}, {
	fromJS: (image) => ({
		...image,
		name: getName(image.url),
	})
});
