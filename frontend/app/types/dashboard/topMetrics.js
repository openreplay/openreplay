import Record from 'Types/Record';

export default Record({
  avgResponseTime: 0,
  requestsCount: 0,
  avgTimeTilFirstBite: 0,
  avgDomCompleteTime: 0
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

