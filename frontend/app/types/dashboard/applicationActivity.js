import Record from 'Types/Record';

export default Record({
  avgPageLoad: 0,
  avgPageLoadProgress: 0,
  avgImgLoad: 0,
  avgImgLoadProgress: 0,
  avgReqLoad: 0,
  avgReqLoadProgress: 0,
}, {
  // fromJS: aa => ({
  //   avgPageLoad: aa.avgDom,
  //   avgPageLoadProgress: aa.avgDomProgress,
  //   avgImgLoad: aa.avgLoad,
  //   avgImgLoadProgress: aa.avgLoadProgress,
  //   avgReqLoad: aa.avgFirstPixel,
  //   avgReqLoadProgress: aa.avgFirstPixelProgress,
  //   ...aa,
  // }),
});

