import Record from 'Types/Record';
import { List, Map } from 'immutable';
import { Duration } from 'luxon';
import SessionEvent, { TYPES } from './event';
import StackEvent from './stackEvent';
import Resource from './resource';
import SessionError, { IError } from './error';
import Issue, { IIssue } from './issue';

const HASH_MOD = 1610612741;
const HASH_P = 53;
function hashString(s: string): number {
  let mul = 1;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash + s.charCodeAt(i) * mul) % HASH_MOD;
    mul = (mul * HASH_P) % HASH_MOD;
  }
  return hash;
}

export default Record(
  {
    sessionId: '',
    pageTitle: '',
    active: false,
    siteId: '',
    projectKey: '',
    peerId: '',
    live: false,
    startedAt: 0,
    duration: 0,
    events: List(),
    stackEvents: List(),
    resources: [],
    missedResources: [],
    metadata: Map(),
    favorite: false,
    filterId: '',
    messagesUrl: '',
    domURL: [],
    devtoolsURL: [],
    mobsUrl: [], // @depricated
    userBrowser: '',
    userBrowserVersion: '?',
    userCountry: '',
    userDevice: '',
    userDeviceType: '',
    isMobile: false,
    userOs: '',
    userOsVersion: '',
    userId: '',
    userAnonymousId: '',
    userUuid: undefined,
    userDisplayName: '',
    userNumericHash: 0,
    viewed: false,
    consoleLogCount: '?',
    eventsCount: '?',
    pagesCount: '?',
    clickRage: undefined,
    clickRageTime: undefined,
    resourcesScore: 0,
    consoleError: undefined,
    resourceError: undefined,
    returningLocation: undefined,
    returningLocationTime: undefined,
    errorsCount: 0,
    issueTypes: [],
    issues: [],
    userDeviceHeapSize: 0,
    userDeviceMemorySize: 0,
    errors: List(),
    crashes: [],
    socket: null,
    isIOS: false,
    revId: '',
    userSessionsCount: 0,
    agentIds: [],
    isCallActive: false,
    agentToken: '',
    notes: [],
    notesWithEvents: [],
    fileKey: '',
  },
  {
    fromJS: ({
      startTs = 0,
      timestamp = 0,
      backendErrors = 0,
      consoleErrors = 0,
      projectId,
      errors = [],
      stackEvents = [],
      issues = [],
      sessionId,
      sessionID,
      domURL = [],
      devtoolsURL = [],
      mobsUrl = [],
      notes = [],
      ...session
    }) => {
      const duration = Duration.fromMillis(session.duration < 1000 ? 1000 : session.duration);
      const durationSeconds = duration.valueOf();
      const startedAt = +startTs || +timestamp;

      const userDevice = session.userDevice || session.userDeviceType || 'Other';
      const userDeviceType = session.userDeviceType || 'other';
      const isMobile = ['console', 'mobile', 'tablet'].includes(userDeviceType);

      const events = List(session.events)
        .map((e) => SessionEvent({ ...e, time: e.timestamp - startedAt }))
        .filter(({ type, time }) => type !== TYPES.CONSOLE && time <= durationSeconds);

      let resources = List(session.resources).map((r) => new Resource(r as any));
      resources.forEach((r: Resource) => {
          r.time = Math.max(0, r.time - startedAt)
        })
      resources = resources.sort((r1, r2) => r1.time - r2.time);
      const missedResources = resources.filter(({ success }) => !success);

      const stackEventsList = List(stackEvents)
        .concat(List(session.userEvents))
        .sortBy((se) => se.timestamp)
        .map((se) => StackEvent({ ...se, time: se.timestamp - startedAt }));
      const exceptions = (errors as IError[]).map(e => new SessionError(e));

      const issuesList = (issues as IIssue[]).map((i, k) => new Issue({ ...i, time: i.timestamp - startedAt, key: k }));

      const rawEvents = !session.events
        ? []
        : // @ts-ignore
          session.events
            .map((evt) => ({ ...evt, time: evt.timestamp - startedAt }))
            .filter(({ type, time }) => type !== TYPES.CONSOLE && time <= durationSeconds) || [];
      const rawNotes = notes;
      const notesWithEvents = [...rawEvents, ...rawNotes].sort((a, b) => {
        const aTs = a.time || a.timestamp;
        const bTs = b.time || b.timestamp;

        return aTs - bTs;
      });

      return {
        ...session,
        isIOS: session.platform === 'ios',
        errors: exceptions,
        siteId: projectId,
        events,
        stackEvents: stackEventsList,
        resources,
        missedResources,
        userDevice,
        userDeviceType,
        isMobile,
        startedAt,
        duration,
        userNumericHash: hashString(
          session.userId ||
            session.userAnonymousId ||
            session.userUuid ||
            session.userID ||
            session.userUUID ||
            ''
        ),
        userDisplayName:
          session.userId || session.userAnonymousId || session.userID || 'Anonymous User',
        issues: issuesList,
        sessionId: sessionId || sessionID,
        userId: session.userId || session.userID,
        mobsUrl: Array.isArray(mobsUrl) ? mobsUrl : [mobsUrl],
        domURL,
        devtoolsURL,
        notes,
        notesWithEvents: List(notesWithEvents),
      };
    },
    idKey: 'sessionId',
  }
);
