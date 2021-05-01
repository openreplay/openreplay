import Record from 'Types/Record';
import { fileType, fileName } from 'App/utils';

const validTypes = ['jpg', 'jpeg', 'js', 'css', 'woff', 'css', 'png', 'gif', 'svg']

export default Record({
  avg: 0,
	url: '',
	type: '',
	name: '',
  chart: [],
}, {
	fromJS: pm => {
		const type = fileType(pm.url).toLowerCase();
		return {
			...pm,
			// type: validTypes.includes(type) ? type : 'n/a',
			// fileName: fileName(pm.url)
		}
	},
});