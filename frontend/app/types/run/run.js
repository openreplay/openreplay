import { Record, List, Map } from 'immutable';
import { DateTime } from 'luxon';
import Environment from 'Types/environment';
import stepFromJS from './step';
import seleniumStepFromJS from './seleniumStep';
import Resource from '../session/resource';
import Log from '../session/log';

export const NOT_FETCHED = undefined;
export const QUEUED = 'queued';
export const INITIALIZING = 'initializing';
export const RUNNING = 'running';
export const COMPLETED = 'completed';
export const PASSED = 'passed';
export const FAILED = 'failed';
export const STOPPED = 'stopped';
export const CRASHED = 'crashed';
export const EXPIRED = 'expired';

export const STATUS = {
  NOT_FETCHED,
  QUEUED,
  INITIALIZING,
  RUNNING,
  COMPLETED,
  PASSED,
  FAILED,
  STOPPED,
  CRASHED,
  EXPIRED,
}

class Run extends Record({
  runId: undefined,
  testId: undefined,
  name: '',
  tags: List(),
  environment: Environment(),
  scheduled: false,
  schedulerId: undefined,
  browser: undefined,
  sessionId: undefined,
  startedAt: undefined,
  url_video: undefined,
  finishedAt: undefined,
  steps: List(),
  resources: [],
  logs: [],
  seleniumSteps: List(),
  url_browser_logs: undefined,
  url_logs: undefined,
  url_selenium_project: undefined,
  sourceCode: undefined,
  screenshotUrl: undefined,
  clientId: undefined,
  state: NOT_FETCHED,
  baseRunId: undefined,
  lastExecutedString: undefined,
  durationString: undefined,
  hour: undefined, // TODO: fine API
  day: undefined,
  location: undefined,
  deviceType: undefined,
  advancedOptions: undefined,
  harfile: undefined,
  lighthouseHtmlFile: undefined,
  resultsFile: undefined,
  lighthouseJsonFile: undefined,
  totalStepsCount: undefined,
  auditsPerformance: Map(),
  auditsAd: Map(),
  transferredSize: undefined,
  resourcesSize: undefined,
  domBuildingTime: undefined,
  domContentLoadedTime: undefined,
  loadTime: undefined,
  starter: undefined,
  // {
  //   "id": '',
  //   "title": '',
  //   "description": '',
  //   "score": 0,
  //   "scoreDisplayMode": '',
  //   "numericValue": 0,
  //   "numericUnit": '',
  //   "displayValue": ''
  // }
}) {
  idKey = 'runId';
  isRunning() {
    return this.state === RUNNING;
  }
  isQueued() {
    return this.state === QUEUED;
  }
  isPassed() {
    return this.state === PASSED;
  }
}

// eslint-disable-next-line complexity
function fromJS(run = {}) {
  if (run instanceof Run) return run;  

  const startedAt = run.startedAt && DateTime.fromMillis(run.startedAt);
  const finishedAt = run.finishedAt && DateTime.fromMillis(run.finishedAt);
  let durationString;
  let lastExecutedString;
  if (run.state === 'running') {
    durationString = 'Running...';
    lastExecutedString = 'Now';
  } else if (startedAt && finishedAt) {
    const _duration = Math.floor(finishedAt - startedAt);
    if (_duration > 10000) {
      const min = Math.floor(_duration / 60000);
      durationString = `${ min < 1 ? 1 : min } min`;
    } else {
      durationString = `${ Math.floor(_duration / 1000) } secs`;
    }    
    const diff = startedAt.diffNow([ 'days', 'hours', 'minutes', 'seconds' ]).negate();
    if (diff.days > 0) {
      lastExecutedString = `${ Math.round(diff.days) } day${ diff.days > 1 ? 's' : '' } ago`;
    } else if (diff.hours > 0) {
      lastExecutedString = `${ Math.round(diff.hours) } hrs ago`;
    } else if (diff.minutes > 0) {
      lastExecutedString = `${ Math.round(diff.minutes) } min ago`;
    } else {
      lastExecutedString = `${ Math.round(diff.seconds) } sec ago`;
    }
  }

  const steps = List(run.steps).map(stepFromJS);
  const seleniumSteps = List(run.seleniumSteps).map(seleniumStepFromJS);
  const tags = List(run.tags);
  const environment = Environment(run.environment);

  let resources = List(run.network)
  .map(i => Resource({ 
    ...i,
    // success: 1,
    // time: i.timestamp,
    // type: 'xhr',
    // headerSize: 1200,
    // timings: {},
  }));  
  const firstResourceTime = resources.map(r => r.time).reduce((a,b)=>Math.min(a,b), Number.MAX_SAFE_INTEGER);  
  resources = resources
    .map(r => r.set("time", r.time - firstResourceTime))
    .sort((r1, r2) => r1.time - r2.time).toArray()

  const logs = List(run.console).map(Log);
  const screenshotUrl = run.screenshot_url ||
    seleniumSteps.find(({ screenshotUrl }) => !!screenshotUrl, null, {}).screenshotUrl;

  const state = run.state === 'completed' ? PASSED : run.state;
  const networkOverview = run.networkOverview || {};

  return new Run({
    ...run,
    startedAt,
    finishedAt,
    durationString,
    lastExecutedString,
    steps,
    resources,
    logs,
    seleniumSteps,
    tags,
    environment,
    screenshotUrl,
    state,
    deviceType: run.device || run.deviceType,
    auditsPerformance: run.lighthouseJson && run.lighthouseJson.performance,
    auditsAd: run.lighthouseJson && run.lighthouseJson.ad,
    transferredSize: networkOverview.transferredSize,
    resourcesSize: networkOverview.resourcesSize,
    domBuildingTime: networkOverview.domBuildingTime,
    domContentLoadedTime: networkOverview.domContentLoadedTime,
    loadTime: networkOverview.loadTime,
  });
}

Run.prototype.exists = function () {
  return this.runId !== undefined;
};

export default fromJS;
