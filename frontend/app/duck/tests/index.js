import { List, Map, Set } from 'immutable';
import Test from 'Types/appTest';
import stepFromJS from 'Types/step';
import crudDuckGenerator from 'Duck/tools/crudDuck';
import { reduceDucks } from 'Duck/tools';
import runsDuck from './runs';
import Run from 'Types/run';

const sampleRun = Run({"runId":8,"testId":7,"name":"test import","createdAt":1601481986264,"createdBy":283,"starter":"on-demand","state":"failed","steps":[{"label":"Open URL","order":0,"title":"navigate","status":"passed","startedAt":1601647536513,"finishedAt":1601647546211,"screenshot":"https://parrot-tests.s3.eu-central-1.amazonaws.com/115/7/8/screenshots/1601647546211.jpg","executionTime":9698},{"label":"Open URL","order":1,"title":"Visit OpenReplay","status":"passed","startedAt":1601647548354,"finishedAt":1601647556991,"screenshot":"https://parrot-tests.s3.eu-central-1.amazonaws.com/115/7/8/screenshots/1601647556991.jpg","executionTime":8637},{"info":"Unhandled promise rejection: TimeoutError: waiting for selector \"[name=\"email\"]\" failed: timeout 30000ms exceeded","input":"failed","label":"Send Keys to Element","order":2,"title":"input","status":"failed","startedAt":1601647559091,"finishedAt":1601647589099,"screenshot":"https://parrot-tests.s3.eu-central-1.amazonaws.com/115/7/8/screenshots/1601647589099.jpg","executionTime":30008}],"browser":"chrome","meta":{"startedAt":1601487715818},"location":"FR","startedAt":1601647524205,"finishedAt":1601647591217,"network":[{"url":"http://yahoo.fr/","method":"GET","duration":1760,"requestID":"769C483871CB3D35DF4BB1CD7D3258C4","timestamp":1601647537533,"requestHeaders":{"cookie":"key1=myvalue1","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36","upgrade-insecure-requests":"1"},"responseHeaders":null,"response":{"data":[{"key":"user_id","index":1},{"key":"virtual_number","index":2}]}},{"url":"http://fr.yahoo.com/","method":"GET","duration":1112,"requestID":"769C483871CB3D35DF4BB1CD7D3258C4","timestamp":1601647539293,"requestHeaders":{"cookie":"key1=myvalue1","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36","upgrade-insecure-requests":"1"},"responseHeaders":null,"payload":{"data":[{"key":"user_id","index":1},{"key":"virtual_number","index":2}]}},{"url":"https://fr.yahoo.com/","method":"GET","duration":1204,"requestID":"769C483871CB3D35DF4BB1CD7D3258C4","timestamp":1601647540405,"requestHeaders":{"cookie":"key1=myvalue1","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36","upgrade-insecure-requests":"1"},"responseHeaders":null},{"url":"https://guce.yahoo.com/consent?brandType=eu&gcrumb=bxFB6Ac&lang=fr-FR&done=https%3A%2F%2Ffr.yahoo.com%2F","method":"GET","duration":1173,"requestID":"769C483871CB3D35DF4BB1CD7D3258C4","timestamp":1601647541609,"requestHeaders":{"cookie":"key1=myvalue1","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36","upgrade-insecure-requests":"1"},"responseHeaders":null},{"url":"https://consent.yahoo.com/v2/collectConsent?sessionId=3_cc-session_fab600d0-8323-4b52-88c1-5698e6288f48","method":"GET","duration":1169,"requestID":"769C483871CB3D35DF4BB1CD7D3258C4","timestamp":1601647542782,"requestHeaders":{"cookie":"key1=myvalue1","user-agent":"Mozilla/5.0 (X11; Linux x86_64)AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36","upgrade-insecure-requests":"1"},"responseHeaders":null},{"url":"https://s.yimg.com/oa/build/css/site-ltr-b1aa14b0.css","method":"GET","duration":1179,"requestID":"56.2","timestamp":1601647543958,"requestHeaders":{"cookie":"key1=myvalue1","referer":"https://consent.yahoo.com/","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36"},"responseHeaders":null},{"url":"https://s.yimg.com/rz/p/yahoo_frontpage_en-US_s_f_p_bestfit_frontpage.png","method":"GET","duration":1189,"requestID":"56.3","timestamp":1601647543959,"requestHeaders":{"cookie":"key1=myvalue1","referer":"https://consent.yahoo.com/","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36"},"responseHeaders":null},{"url":"https://s.yimg.com/oa/build/js/site-ee81be05.js","method":"GET","duration":1194,"requestID":"56.5","timestamp":1601647543961,"requestHeaders":{"cookie":"key1=myvalue1","referer":"https://consent.yahoo.com/","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36"},"responseHeaders":null},{"url":"https://s.yimg.com/rz/p/yahoo_frontpage_en-US_s_f_w_bestfit_frontpage.png","method":"GET","duration":1189,"requestID":"56.4","timestamp":1601647543961,"requestHeaders":{"cookie":"key1=myvalue1","referer":"https://consent.yahoo.com/","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36"},"responseHeaders":null},{"url":"https://s.yimg.com/oa/build/images/fr-FR-home_11f60c18d02223c8.jpeg","method":"GET","duration":1068,"requestID":"56.7","timestamp":1601647545141,"requestHeaders":{"cookie":"key1=myvalue1","referer":"https://s.yimg.com/oa/build/css/site-ltr-b1aa14b0.css","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36"},"responseHeaders":null},{"url":"http://yahoo.fr/","method":"GET","duration":1312,"requestID":"7CA8FE6239B07643872BF48C30D639D3","timestamp":1601647549363,"requestHeaders":{"cookie":"key1=myvalue1","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36","upgrade-insecure-requests":"1"},"responseHeaders":null},{"url":"http://fr.yahoo.com/","method":"GET","duration":1005,"requestID":"7CA8FE6239B07643872BF48C30D639D3","timestamp":1601647550675,"requestHeaders":{"cookie":"key1=myvalue1","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36","upgrade-insecure-requests":"1"},"responseHeaders":null},{"url":"https://fr.yahoo.com/","method":"GET","duration":1037,"requestID":"7CA8FE6239B07643872BF48C30D639D3","timestamp":1601647551680,"requestHeaders":{"cookie":"key1=myvalue1","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36","upgrade-insecure-requests":"1"},"responseHeaders":null},{"url":"https://guce.yahoo.com/consent?brandType=eu&gcrumb=ESjhlqw&lang=fr-FR&done=https%3A%2F%2Ffr.yahoo.com%2F","method":"GET","duration":1045,"requestID":"7CA8FE6239B07643872BF48C30D639D3","timestamp":1601647552717,"requestHeaders":{"cookie":"key1=myvalue1","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36","upgrade-insecure-requests":"1"},"responseHeaders":null},{"url":"https://consent.yahoo.com/v2/collectConsent?sessionId=3_cc-session_3b367c91-9f88-498b-96a5-728947dda245","method":"GET","duration":1115,"requestID":"7CA8FE6239B07643872BF48C30D639D3","timestamp":1601647553762,"requestHeaders":{"cookie":"key1=myvalue1","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36","upgrade-insecure-requests":"1"},"responseHeaders":null},{"url":"https://s.yimg.com/oa/build/css/site-ltr-b1aa14b0.css","method":"GET","duration":1052,"requestID":"56.14","timestamp":1601647554885,"requestHeaders":{"cookie":"key1=myvalue1","referer":"https://consent.yahoo.com/","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36"},"responseHeaders":null},{"url":"https://s.yimg.com/rz/p/yahoo_frontpage_en-US_s_f_p_bestfit_frontpage.png","method":"GET","duration":1060,"requestID":"56.15","timestamp":1601647554886,"requestHeaders":{"cookie":"key1=myvalue1","referer":"https://consent.yahoo.com/","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36"},"responseHeaders":null},{"url":"https://s.yimg.com/oa/build/js/site-ee81be05.js","method":"GET","duration":1065,"requestID":"56.17","timestamp":1601647554886,"requestHeaders":{"cookie":"key1=myvalue1","referer":"https://consent.yahoo.com/","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36"},"responseHeaders":null},{"url":"https://s.yimg.com/rz/p/yahoo_frontpage_en-US_s_f_w_bestfit_frontpage.png","method":"GET","duration":1063,"requestID":"56.16","timestamp":1601647554886,"requestHeaders":{"cookie":"key1=myvalue1","referer":"https://consent.yahoo.com/","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36"},"responseHeaders":null},{"url":"https://s.yimg.com/oa/build/images/fr-FR-home_11f60c18d02223c8.jpeg","method":"GET","duration":1046,"requestID":"56.19","timestamp":1601647555944,"requestHeaders":{"cookie":"key1=myvalue1","referer":"https://s.yimg.com/oa/build/css/site-ltr-b1aa14b0.css","user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36"},"responseHeaders":null}],"environmentId":null,"tenantId":115,"consoleLogs":[{"_type":"warning","_text":"A cookie associated with a resource at http://openreplay.com/ was set with `SameSite=None` but without `Secure`. It has been blocked, as Chrome now only delivers cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.","_args":[],"_location":{"url":"https://app.openreplay.com/"},"timestamp":1602089840909},{"_type":"warning","_text":"A cookie associated with a resource at http://app.openreplay.com/ was set with `SameSite=None` but without `Secure`. It has been blocked, as Chrome now only delivers cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.","_args":[],"_location":{"url":"https://app.openreplay.com/"},"timestamp":1602089840918}]});

const ADD_STEPS = 'tests/ADD_STEPS';
const MOVE_STEP = 'tests/MOVE_STEP';
const REMOVE_STEP = 'tests/REMOVE_STEP';
const COPY_STEP = 'tests/COPY_STEP';
const EDIT_STEP = 'tests/EDIT_STEP';
const TOGGLE_STEP = 'tests/TOGGLE_STEP';
const ADD_TAG = 'tests/ADD_TAG';
const REMOVE_TAG = 'tests/REMOVE_TAG';
const TOGGLE_TAG = 'tests/TOGGLE_TAG';
const SET_MODIFIED = 'tests/SET_MODIFIED';
const SET_QUERY = 'tests/SET_QUERY';

const MOVE_TEST = 'tests/MOVE_TEST';

const initialState = Map({
  tags: Set(),
  query: '',
  modified: false,
  sampleRun: sampleRun,
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case SET_MODIFIED:
      return state.set('modified', action.state);
    case SET_QUERY:
      return state.set('query', action.query);
    case ADD_STEPS:
      // TODO check frameworks
      return state
        .updateIn([ 'instance', 'steps' ], list => list.concat(action.steps.map(stepFromJS))).set('modified', true);
    case MOVE_STEP: {
      const { fromI, toI } = action;
      return state
        .updateIn([ 'instance', 'steps' ], list =>
          list.remove(fromI).insert(toI, list.get(fromI))).set('modified', true);
    }
    case REMOVE_STEP:
      return state.removeIn([ 'instance', 'steps', action.index ]).set('modified', true);
    case COPY_STEP: {
      // Use fromJS to make another key.
      const copiedStep = stepFromJS(state
        .getIn([ 'instance', 'steps', action.index ])
        .set('imported', false));
      return state
        .updateIn([ 'instance', 'steps' ], steps =>
          steps.insert(action.index + 1, copiedStep)).set('modified', true);
    }
    case EDIT_STEP:
      return state.mergeIn([ 'instance', 'steps', action.index ], action.step).set('modified', true);
    case TOGGLE_STEP:
      return state.updateIn([ 'instance', 'steps', action.index, 'isDisabled' ], isDisabled => !isDisabled).set('modified', true);
    case ADD_TAG:
      return state.updateIn([ 'instance', 'tags' ], tags => tags.add(action.tag)).set('modified', true);
    case REMOVE_TAG:
      return state.updateIn([ 'instance', 'tags' ], tags => tags.remove(action.tag)).set('modified', true);
    case TOGGLE_TAG: {
      const { tag, flag } = action;
      const adding = typeof flag === 'boolean'
        ? flag
        : !state.hasIn([ 'tags', tag ]);
      return state.update('tags', tags => (adding
        ? tags.add(tag)
        : tags.remove(tag)));
    }
    case MOVE_TEST: {
      const { fromI, toI } = action;
      return state
        .updateIn([ 'list' ], list =>
          list.remove(fromI).insert(toI, list.get(fromI)));
    }
  }
  return state;
};

const crudDuck = crudDuckGenerator('test', Test);
export const { fetchList, fetch, init, edit, save, remove } = crudDuck.actions;
export { runTest, stopRun, checkRun, generateTest, stopAllRuns, resetErrors } from './runs';
export default reduceDucks(crudDuck, { reducer, initialState }, runsDuck).reducer;

export function addSteps(stepOrSteps) {
  const steps = Array.isArray(stepOrSteps) || List.isList(stepOrSteps)
    ? stepOrSteps
    : [ stepOrSteps ];
  return {
    type: ADD_STEPS,
    steps,
  };
}

export function moveStep(fromI, toI) {
  return {
    type: MOVE_STEP,
    fromI,
    toI,
  };
}

export function removeStep(index) {
  return {
    type: REMOVE_STEP,
    index,
  };
}

export function copyStep(index) {
  return {
    type: COPY_STEP,
    index,
  };
}

export function editStep(index, step) {
  return {
    type: EDIT_STEP,
    index,
    step,
  };
}

export function setModified(state) {
  return {
    type: SET_MODIFIED,
    state,
  };
}

export function toggleStep(index) {
  return {
    type: TOGGLE_STEP,
    index,
  };
}

export const addTag = (tag) => (dispatch) => {
  return new Promise((resolve) => {
    dispatch({
      type: ADD_TAG,
      tag,
    })
    resolve()
  })
}

export const removeTag = (tag) => (dispatch) => {
  return new Promise((resolve) => {
    dispatch({
      type: REMOVE_TAG,
      tag,
    });
    resolve()
  })
}

export function toggleTag(tag, flag) {
  return {
    type: TOGGLE_TAG,
    tag,
    flag,
  };
}

export function setQuery(query) {
  return {
    type: SET_QUERY,
    query
  };
}

export function moveTest(fromI, toI) {
  return {
    type: MOVE_TEST,
    fromI,
    toI,
  };
}
