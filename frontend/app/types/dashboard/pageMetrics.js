import Record from 'Types/Record';

export default Record({
  avgLoad: 0,
  avgLoadProgress: 0,
  avgFirstContentfulPixel: 0,
  avgFirstContentfulPixelProgress: 0,
}, {
	fromJS: pm => ({
		...pm,
		avgFirstContentfulPixel: pm.avgFirstContentfulPixel || pm.avgFirstPixel,
		avgFirstContentfulPixelProgress: pm.avgFirstContentfulPixelProgress || pm.avgFirstPixelProgress,
	}),
});