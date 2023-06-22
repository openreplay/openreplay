import { Duration } from 'luxon';
import SessionEvent, { TYPES, EventData, InjectedEvent } from './event';
import StackEvent from './stackEvent';
import SessionError, { IError } from './error';
import Issue, { IIssue, types as issueTypes } from './issue';
import { Note } from 'App/services/NotesService';
import { toJS } from 'mobx';

const HASH_MOD = 1610612741;
const HASH_P = 53;

export function mergeEventLists<T extends Record<string, any>, Y extends Record<string, any>>(arr1: T[], arr2: Y[]): Array<T | Y> {
  let merged = [];
  let index1 = 0;
  let index2 = 0;
  let current = 0;

  while (current < (arr1.length + arr2.length)) {

    let isArr1Depleted = index1 >= arr1.length;
    let isArr2Depleted = index2 >= arr2.length;

    if (!isArr1Depleted && (isArr2Depleted || (arr1[index1].timestamp < arr2[index2].timestamp))) {
      merged[current] = arr1[index1];
      index1++;
    } else {
      merged[current] = arr2[index2];
      index2++;
    }

    current++;
  }

  return merged;
}
export function sortEvents(a: Record<string, any>, b: Record<string, any>) {

  const aTs = a.time || a.timestamp;
  const bTs = b.time || b.timestamp;

  return aTs - bTs;
}

function hashString(s: string): number {
  let mul = 1;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash + s.charCodeAt(i) * mul) % HASH_MOD;
    mul = (mul * HASH_P) % HASH_MOD;
  }
  return hash;
}

export interface ISession {
  sessionId: string;
  pageTitle: string;
  active: boolean;
  siteId: string;
  projectKey: string;
  peerId: string;
  live: boolean;
  startedAt: number;
  duration: number;
  events: InjectedEvent[];
  stackEvents: StackEvent[];
  metadata: [];
  favorite: boolean;
  filterId?: string;
  domURL: string[];
  devtoolsURL: string[];
  /**
   * @deprecated
   */
  mobsUrl: string[];
  userBrowser: string;
  userBrowserVersion: string;
  userCountry: string;
  userCity: string;
  userState: string;
  userDevice: string;
  userDeviceType: string;
  isMobile: boolean;
  userOs: string;
  userOsVersion: string;
  userId: string;
  userAnonymousId: string;
  userUuid: string;
  userDisplayName: string;
  userNumericHash: number;
  viewed: boolean;
  consoleLogCount: number;
  eventsCount: number;
  pagesCount: number;
  errorsCount: number;
  issueTypes: string[];
  issues: IIssue[];
  referrer: string | null;
  userDeviceHeapSize: number;
  userDeviceMemorySize: number;
  errors: SessionError[];
  crashes?: [];
  socket: string;
  isIOS: boolean;
  revId: string | null;
  agentIds?: string[];
  isCallActive?: boolean;
  agentToken: string;
  notes: Note[];
  notesWithEvents: Array<Note | InjectedEvent>;
  fileKey: string;
  platform: string;
  projectId: string;
  startTs: number;
  timestamp: number;
  backendErrors: number;
  consoleErrors: number;
  sessionID?: string;
  userID: string;
  userUUID: string;
  userEvents: any[];
}

const emptyValues = {
  startTs: 0,
  timestamp: 0,
  backendErrors: 0,
  consoleErrors: 0,
  sessionID: '',
  projectId: '',
  errors: [],
  stackEvents: [],
  issues: [],
  sessionId: '',
  domURL: [],
  devtoolsURL: [],
  mobsUrl: [],
  notes: [],
  metadata: {},
  startedAt: 0,
};

export default class Session {
  sessionId: ISession['sessionId'];
  pageTitle: ISession['pageTitle'];
  active: ISession['active'];
  siteId: ISession['siteId'];
  projectKey: ISession['projectKey'];
  peerId: ISession['peerId'];
  live: ISession['live'];
  startedAt: ISession['startedAt'];
  duration: ISession['duration'];
  events: ISession['events'];
  stackEvents: ISession['stackEvents'];
  metadata: ISession['metadata'];
  favorite: ISession['favorite'];
  filterId?: ISession['filterId'];
  domURL: ISession['domURL'];
  devtoolsURL: ISession['devtoolsURL'];
  /**
   * @deprecated
   */
  mobsUrl: ISession['mobsUrl'];
  userBrowser: ISession['userBrowser'];
  userBrowserVersion: ISession['userBrowserVersion'];
  userCountry: ISession['userCountry'];
  userCity: ISession['userCity'];
  userState: ISession['userState'];
  userDevice: ISession['userDevice'];
  userDeviceType: ISession['userDeviceType'];
  isMobile: ISession['isMobile'];
  userOs: ISession['userOs'];
  userOsVersion: ISession['userOsVersion'];
  userId: ISession['userId'];
  userAnonymousId: ISession['userAnonymousId'];
  userUuid: ISession['userUuid'];
  userDisplayName: ISession['userDisplayName'];
  userNumericHash: ISession['userNumericHash'];
  viewed: ISession['viewed'];
  consoleLogCount: ISession['consoleLogCount'];
  eventsCount: ISession['eventsCount'];
  pagesCount: ISession['pagesCount'];
  errorsCount: ISession['errorsCount'];
  issueTypes: ISession['issueTypes'];
  issues: Issue[];
  referrer: ISession['referrer'];
  userDeviceHeapSize: ISession['userDeviceHeapSize'];
  userDeviceMemorySize: ISession['userDeviceMemorySize'];
  errors: ISession['errors'];
  crashes?: ISession['crashes'];
  socket: ISession['socket'];
  isIOS: ISession['isIOS'];
  revId: ISession['revId'];
  agentIds?: ISession['agentIds'];
  isCallActive?: ISession['isCallActive'];
  agentToken: ISession['agentToken'];
  notes: ISession['notes'];
  notesWithEvents: ISession['notesWithEvents'];
  frustrations: Array<IIssue | InjectedEvent>

  fileKey: ISession['fileKey'];
  durationSeconds: number;

  constructor(plainSession?: ISession) {
    const sessionData = plainSession || (emptyValues as unknown as ISession);
    const {
      startTs = 0,
      timestamp = 0,
      backendErrors = 0,
      consoleErrors = 0,
      sessionID = '',
      projectId = '',
      errors = [],
      stackEvents = [],
      issues = [],
      sessionId = '',
      domURL = [],
      devtoolsURL = [],
      mobsUrl = [],
      notes = [],
      ...session
    } = sessionData;
    const duration = Duration.fromMillis(session.duration < 1000 ? 1000 : session.duration);
    const durationSeconds = duration.valueOf();
    const startedAt = +startTs || +timestamp;

    const userDevice = session.userDevice || session.userDeviceType || 'Other';
    const userDeviceType = session.userDeviceType || 'other';
    const isMobile = ['console', 'mobile', 'tablet'].includes(userDeviceType);

    const events: InjectedEvent[] = [];
    const rawEvents: (EventData & { key: number })[] = [];

    if (session.events?.length) {
      (session.events as EventData[]).forEach((event: EventData, k) => {
        const time = event.timestamp - startedAt;
        if (event.type !== TYPES.CONSOLE && time <= durationSeconds) {
          const EventClass = SessionEvent({ ...event, time, key: k });
          if (EventClass) {
            events.push(EventClass);
          }
          rawEvents.push({ ...event, time, key: k });
        }
      });
    }

    const stackEventsList: StackEvent[] = [];
    if (stackEvents?.length || session.userEvents?.length) {
      const mergedArrays = [...stackEvents, ...session.userEvents]
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((se) => new StackEvent({ ...se, time: se.timestamp - startedAt }));
      stackEventsList.push(...mergedArrays);
    }

    const exceptions = (errors as IError[]).map((e) => new SessionError(e)) || [];

    const issuesList =
      (issues as IIssue[]).map(
        (i, k) => new Issue({ ...i, time: i.timestamp - startedAt, key: k })
      ) || [];

    const rawNotes = notes;

    const frustrationEvents = events.filter(ev => {
        if (ev.type === TYPES.CLICK || ev.type === TYPES.INPUT) {
          // @ts-ignore
          return ev.hesitation > 1000
        }
        return ev.type === TYPES.CLICKRAGE
      }
    )
    const frustrationIssues = issuesList.filter(i => i.type === issueTypes.MOUSE_THRASHING)

    const frustrationList = [...frustrationEvents, ...frustrationIssues].sort(sortEvents) || [];

    const mixedEventsWithIssues = mergeEventLists(
      mergeEventLists(rawEvents, rawNotes),
      frustrationIssues
    ).sort(sortEvents)

    Object.assign(this, {
      ...session,
      isIOS: session.platform === 'ios',
      errors: exceptions,
      siteId: projectId,
      events,
      stackEvents: stackEventsList,
      userDevice,
      userDeviceType,
      isMobile,
      startedAt,
      duration,
      durationSeconds,
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
      notesWithEvents: mixedEventsWithIssues,
      frustrations: frustrationList,
    });
  }

  addEvents(
    sessionEvents: EventData[],
    errors: any[],
    issues: any[],
    resources: any[],
    userEvents: any[],
    stackEvents: any[]
  ) {
    const exceptions = (errors as IError[]).map((e) => new SessionError(e)) || [];
    const issuesList =
      (issues as IIssue[]).map(
        (i, k) => new Issue({ ...i, time: i.timestamp - this.startedAt, key: k })
      ) || [];
    const stackEventsList: StackEvent[] = [];
    if (stackEvents?.length || userEvents?.length) {
      const mergedArrays = [...stackEvents, ...userEvents]
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((se) => new StackEvent({ ...se, time: se.timestamp - this.startedAt }));
      stackEventsList.push(...mergedArrays);
    }

    const events: InjectedEvent[] = [];
    const rawEvents: (EventData & { key: number })[] = [];

    if (sessionEvents.length) {
      sessionEvents.forEach((event, k) => {
        const time = event.timestamp - this.startedAt;
        if (event.type !== TYPES.CONSOLE && time <= this.durationSeconds) {
          const EventClass = SessionEvent({ ...event, time, key: k });
          if (EventClass) {
            events.push(EventClass);
          }
          rawEvents.push({ ...event, time, key: k });
        }
      });
    }

    const frustrationEvents = events.filter(ev => {
        if (ev.type === TYPES.CLICK || ev.type === TYPES.INPUT) {
          // @ts-ignore
          return ev.hesitation > 1000
        }
        return ev.type === TYPES.CLICKRAGE
      }
    )

    const frustrationIssues = issuesList.filter(i => i.type === issueTypes.MOUSE_THRASHING)
    const frustrationList = [...frustrationEvents, ...frustrationIssues].sort(sortEvents) || [];

    const mixedEventsWithIssues = mergeEventLists(
      rawEvents,
      frustrationIssues
    )

    this.events = events;
    // @ts-ignore
    this.notesWithEvents = [...this.notesWithEvents, ...mixedEventsWithIssues].sort(sortEvents);
    this.errors = exceptions;
    this.issues = issuesList;
    // @ts-ignore legacy code? no idea
    this.resources = resources;
    this.stackEvents = stackEventsList;
    // @ts-ignore
    this.frustrations = frustrationList;
    return this;
  }

  addNotes(sessionNotes: Note[]) {
    sessionNotes.forEach((note) => {
      // @ts-ignore veri dirti
      note.time = note.timestamp
    })
    // @ts-ignore
    this.notesWithEvents =
      [...this.notesWithEvents, ...sessionNotes].sort(sortEvents) || [];
    this.notes = sessionNotes;

    return this;
  }

  toJS() {
    return { ...toJS(this) };
  }
}
