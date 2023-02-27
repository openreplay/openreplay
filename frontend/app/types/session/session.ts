import { Duration } from 'luxon';
import SessionEvent, { TYPES, EventData, InjectedEvent } from './event';
import StackEvent from './stackEvent';
import SessionError, { IError } from './error';
import Issue, { IIssue } from './issue';
import { Note } from 'App/services/NotesService'

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

export interface ISession {
  sessionId: string,
  pageTitle: string,
  active: boolean,
  siteId: string,
  projectKey: string,
  peerId: string,
  live: boolean,
  startedAt: number,
  duration: number,
  events: InjectedEvent[],
  stackEvents: StackEvent[],
  metadata: [],
  favorite: boolean,
  filterId?: string,
  domURL: string[],
  devtoolsURL: string[],
  /**
   * @deprecated
   */
  mobsUrl: string[],
  userBrowser: string,
  userBrowserVersion: string,
  userCountry: string,
  userDevice: string,
  userDeviceType: string,
  isMobile: boolean,
  userOs: string,
  userOsVersion: string,
  userId: string,
  userAnonymousId: string,
  userUuid: string,
  userDisplayName: string,
  userNumericHash: number,
  viewed: boolean,
  consoleLogCount: number,
  eventsCount: number,
  pagesCount: number,
  errorsCount: number,
  issueTypes: string[],
  issues: [],
  referrer: string | null,
  userDeviceHeapSize: number,
  userDeviceMemorySize: number,
  errors: SessionError[],
  crashes?: [],
  socket: string,
  isIOS: boolean,
  revId: string | null,
  agentIds?: string[],
  isCallActive?: boolean,
  agentToken: string,
  notes: Note[],
  notesWithEvents: Array<Note | InjectedEvent>,
  fileKey: string,
  platform: string,
  projectId: string,
  startTs: number,
  timestamp: number,
  backendErrors: number,
  consoleErrors: number,
  sessionID?: string,
  userID: string,
  userUUID: string,
  userEvents: any[],
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
}

export default class Session {
  sessionId: ISession["sessionId"]
  pageTitle: ISession["pageTitle"]
  active: ISession["active"]
  siteId: ISession["siteId"]
  projectKey: ISession["projectKey"]
  peerId: ISession["peerId"]
  live: ISession["live"]
  startedAt: ISession["startedAt"]
  duration: ISession["duration"]
  events: ISession["events"]
  stackEvents: ISession["stackEvents"]
  metadata: ISession["metadata"]
  favorite: ISession["favorite"]
  filterId?: ISession["filterId"]
  domURL: ISession["domURL"]
  devtoolsURL: ISession["devtoolsURL"]
  /**
   * @deprecated
   */
  mobsUrl: ISession["mobsUrl"]
  userBrowser: ISession["userBrowser"]
  userBrowserVersion: ISession["userBrowserVersion"]
  userCountry: ISession["userCountry"]
  userDevice: ISession["userDevice"]
  userDeviceType: ISession["userDeviceType"]
  isMobile: ISession["isMobile"]
  userOs: ISession["userOs"]
  userOsVersion: ISession["userOsVersion"]
  userId: ISession["userId"]
  userAnonymousId: ISession["userAnonymousId"]
  userUuid: ISession["userUuid"]
  userDisplayName: ISession["userDisplayName"]
  userNumericHash: ISession["userNumericHash"]
  viewed: ISession["viewed"]
  consoleLogCount: ISession["consoleLogCount"]
  eventsCount: ISession["eventsCount"]
  pagesCount: ISession["pagesCount"]
  errorsCount: ISession["errorsCount"]
  issueTypes: ISession["issueTypes"]
  issues: ISession["issues"]
  referrer: ISession["referrer"]
  userDeviceHeapSize: ISession["userDeviceHeapSize"]
  userDeviceMemorySize: ISession["userDeviceMemorySize"]
  errors: ISession["errors"]
  crashes?: ISession["crashes"]
  socket: ISession["socket"]
  isIOS: ISession["isIOS"]
  revId: ISession["revId"]
  agentIds?: ISession["agentIds"]
  isCallActive?: ISession["isCallActive"]
  agentToken: ISession["agentToken"]
  notes: ISession["notes"]
  notesWithEvents: ISession["notesWithEvents"]
  fileKey: ISession["fileKey"]

  constructor(plainSession?: ISession) {
    const sessionData = plainSession || (emptyValues as unknown as ISession)
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
    } = sessionData
    const duration = Duration.fromMillis(session.duration < 1000 ? 1000 : session.duration);
    const durationSeconds = duration.valueOf();
    const startedAt = +startTs || +timestamp;

    const userDevice = session.userDevice || session.userDeviceType || 'Other';
    const userDeviceType = session.userDeviceType || 'other';
    const isMobile = ['console', 'mobile', 'tablet'].includes(userDeviceType);

    const events: InjectedEvent[] = []
    const rawEvents: (EventData & { key: number })[] = []

    if (session.events?.length) {
      (session.events as EventData[]).forEach((event: EventData, k) => {
        const time = event.timestamp - startedAt
        if (event.type !== TYPES.CONSOLE && time <= durationSeconds) {
          const EventClass = SessionEvent({ ...event, time, key: k })
          if (EventClass) {
            events.push(EventClass);
          }
          rawEvents.push({ ...event, time, key: k });
        }
      })
    }

    const stackEventsList: StackEvent[] = []
    if (stackEvents?.length || session.userEvents?.length) {
      const mergedArrays = [...stackEvents, ...session.userEvents]
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((se) => new StackEvent({ ...se, time: se.timestamp - startedAt }))
      stackEventsList.push(...mergedArrays);
    }

    const exceptions = (errors as IError[]).map(e => new SessionError(e)) || [];

    const issuesList = (issues as IIssue[]).map(
      (i, k) => new Issue({ ...i, time: i.timestamp - startedAt, key: k })) || [];

    const rawNotes = notes;
    const notesWithEvents = [...rawEvents, ...rawNotes].sort((a, b) => {
      // @ts-ignore just in case
      const aTs = a.timestamp || a.time;
      // @ts-ignore
      const bTs = b.timestamp || b.time;

      return aTs - bTs;
    }) || [];

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
      notesWithEvents: notesWithEvents,
    })
  }
}