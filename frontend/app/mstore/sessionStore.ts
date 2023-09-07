import { makeAutoObservable, observable, action } from 'mobx';
import { sessionService } from 'App/services';
import { filterMap } from 'Duck/search';
import Session from 'Types/session';
import Record, { LAST_7_DAYS } from 'Types/app/period';
import Watchdog from "Types/watchdog";
import ErrorStack from 'Types/session/errorStack';
import { Location, InjectedEvent } from 'Types/session/event'
import { getDateRangeFromValue } from "App/dateRange";
import { getRE, setSessionFilter, getSessionFilter, compareJsonObjects, cleanSessionFilters } from 'App/utils';
import store from 'App/store'
import { Note } from "App/services/NotesService";

class UserFilter {
  endDate: number = new Date().getTime();
  startDate: number = new Date().getTime() - 24 * 60 * 60 * 1000;
  rangeName: string = LAST_7_DAYS;
  filters: any = [];
  page: number = 1;
  limit: number = 10;
  period: any = Record({ rangeName: LAST_7_DAYS });

  constructor() {
    makeAutoObservable(this, {
      page: observable,
      update: action,
    });
  }

  update(key: string, value: any) {
    // @ts-ignore
    this[key] = value;

    if (key === 'period') {
      this.startDate = this.period.start;
      this.endDate = this.period.end;
    }
  }

  setFilters(filters: any[]) {
    this.filters = filters;
  }

  setPage(page: number) {
    this.page = page;
  }

  toJson() {
    return {
      endDate: this.period.end,
      startDate: this.period.start,
      filters: this.filters.map(filterMap),
      page: this.page,
      limit: this.limit,
    };
  }
}

interface BaseDevState {
  index: number;
  filter: string;
  activeTab: string;
  isError: boolean;
}

class DevTools {
  network: BaseDevState;
  stackEvent: BaseDevState;
  console: BaseDevState;

  constructor() {
    this.network = { index: 0, filter: '', activeTab: 'ALL', isError: false };
    this.stackEvent = { index: 0, filter: '', activeTab: 'ALL', isError: false };
    this.console = { index: 0, filter: '', activeTab: 'ALL', isError: false };
    makeAutoObservable(this, {
      update: action,
    });
  }

  update(key: string, value: any) {
    // @ts-ignore
    this[key] = Object.assign(this[key], value);
  }
}

const range = getDateRangeFromValue(LAST_7_DAYS);
const defaultDateFilters = {
  url: '',
  rangeValue: LAST_7_DAYS,
  startDate: range.start.unix() * 1000,
  endDate: range.end.unix() * 1000,
};

export default class SessionStore {
  userFilter: UserFilter = new UserFilter();
  devTools: DevTools = new DevTools();

  list: Session[] = []
  sessionIds: string[] = []
  current = new Session()
  total = 0
  keyMap = {}
  wdTypeCount = {}
  favoriteList: Session[] = []
  activeTab = Watchdog({ name: 'All', type: 'all' })
  timezone = 'local'
  errorStack: ErrorStack[] = []
  eventsIndex = []
  sourcemapUploaded = true
  filteredEvents: InjectedEvent[] | null = null
  eventsQuery = ''
  showChatWindow = false
  liveSessions: Session[] = []
  visitedEvents = []
  insights: any[] = []
  insightFilters = defaultDateFilters
  host = ''
  funnelPage = {}
  /** @Deprecated */
  timelinePointer = {}
  sessionPath = {}
  lastPlayedSessionId: string
  timeLineTooltip = { time: 0, offset: 0, isVisible: false, localTime: '', userTime: '' }
  createNoteTooltip = { time: 0, isVisible: false, isEdit: false, note: null }
  previousId = ''
  nextId = ''
  userTimezone = ''

  constructor() {
    makeAutoObservable(this, {
      userFilter: observable,
      devTools: observable,
    });
  }

  setUserTimezone(timezone: string) {
    this.userTimezone = timezone;
  }

  resetUserFilter() {
    this.userFilter = new UserFilter();
  }

  getSessions(filter: any): Promise<any> {
    return new Promise((resolve, reject) => {
      sessionService
        .getSessions(filter.toJson?.() || filter)
        .then((response: any) => {
          resolve({
            sessions: response.sessions.map((session: any) => new Session(session)),
            total: response.total,
          });
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  async fetchLiveSessions(params = {}) {
    try {
      const data = await sessionService.getLiveSessions(params);
      this.liveSessions = data.map(session => new Session({ ...session, live: true }));
    } catch (e) {
      console.error(e)
    }
  }

  async fetchSessions(params = {}, force = false) {
    try {
      if (!force) {
        const oldFilters = getSessionFilter();
        if (compareJsonObjects(oldFilters, cleanSessionFilters(params))) {
          return;
        }
      }
      setSessionFilter(cleanSessionFilters(params));
      const data = await sessionService.getSessions(params);
      const list = data.sessions.map(s => new Session(s))

      this.list = list;
      this.total = data.total;
      this.sessionIds = data.sessions.map(s => s.sessionId);
      this.favoriteList = list.filter(s => s.favorite);
    } catch (e) {
      console.error(e)
    }
  }

  async fetchSessionInfo(sessionId: string, isLive = false) {
    try {
      const { events } = store.getState().getIn(['filters', 'appliedFilter']);
      const data = await sessionService.getSessionInfo(sessionId, isLive)
      const session = new Session(data)

      const matching: number[] = [];
      const visitedEvents: Location[] = [];
      const tmpMap: Set<string> = new Set();

      session.events.forEach((event) => {
        if (event.type === 'LOCATION' && !tmpMap.has(event.url)) {
          tmpMap.add(event.url);
          visitedEvents.push(event);
        }
      });


      (events as {}[]).forEach(({ key, operator, value }: any) => {
        session.events.forEach((e, index) => {
          if (key === e.type) {
            const val = e.type === 'LOCATION' ? e.url : e.value;
            if (operator === 'is' && value === val) {
              matching.push(index);
            }
            if (operator === 'contains' && val.includes(value)) {
              matching.push(index);
            }
          }
        });
      });
    } catch (e) {
      console.error(e)
    }
  }

  async fetchErrorStack(sessionId: string, errorId: string) {
    try {
      const data = await sessionService.getErrorStack(sessionId, errorId);
      this.errorStack = data.trace.map(es => new ErrorStack(es))
    } catch (e) {
      console.error(e)
    }
  }

  async fetchAutoplayList(params = {}) {
    try {
      setSessionFilter(cleanSessionFilters(params));
      const data = await sessionService.getAutoplayList(params);
      const list = [...this.sessionIds, ...data.map(s => s.sessionId)]
      this.sessionIds = list.filter((id, ind) => list.indexOf(id) === ind);
    } catch (e) {
      console.error(e)
    }
  }

  setAutoplayValues() {
    const currentId = this.current.sessionId
    const currentIndex = this.sessionIds.indexOf(currentId)

    this.previousId = this.sessionIds[currentIndex - 1]
    this.nextId = this.sessionIds[currentIndex + 1]
  }

  setEventQuery(filter: { query: string }) {
    const events = this.current.events
    const query = filter.query;
    const searchRe = getRE(query, 'i')

    const filteredEvents = query ? events.filter(
      (e) => searchRe.test(e.url)
        || searchRe.test(e.value)
        || searchRe.test(e.label)
        || searchRe.test(e.type)
        || (e.type === 'LOCATION' && searchRe.test('visited'))
    ) : null;

    this.filteredEvents = filteredEvents
    this.eventsQuery = query
  }

  async toggleFavorite(id: string) {
    try {
      const r = await sessionService.toggleFavorite(id)
      if (r.success) {
        const list = this.list;
        const current = this.current;
        const sessionIdx = list.findIndex(({ sessionId }) => sessionId === id);
        const session = list[sessionIdx]
        const wasInFavorite = this.favoriteList.findIndex(({ sessionId }) => sessionId === id) > -1;

        if (session && !wasInFavorite) {
          session.favorite = true
          this.list[sessionIdx] = session
        }
        if (current.sessionId === id) {
          this.current.favorite = !wasInFavorite
        }

        if (session) {
          if (wasInFavorite) {
            this.favoriteList = this.favoriteList.filter(({ sessionId }) => sessionId !== id)
          } else {
            this.favoriteList.push(session)
          }
        }
      } else {
        console.error(r)
      }
    } catch (e) {
      console.error(e)
    }
  }

  sortSessions(sortKey: string, sign: number) {
    const comparator = (s1: Session, s2: Session) => {
      // @ts-ignore
      let diff = s1[sortKey] - s2[sortKey];
      diff = diff === 0 ? s1.startedAt - s2.startedAt : diff;
      return sign * diff;
    };

    this.list = this.list.sort(comparator)
    this.favoriteList = this.favoriteList.sort(comparator)
    return;
  }

  setActiveTab(tab: { type: string }) {
    const list = tab.type === 'all'
      ? this.list : this.list.filter(s => s.issueTypes.includes(tab.type))

    // @ts-ignore
    this.activeTab = tab
    this.sessionIds = list.map(s => s.sessionId)
  }

  setTimezone(tz: string) {
    this.timezone = tz;
  }

  toggleChatWindow(isActive: boolean) {
    this.showChatWindow = isActive
  }

  async fetchInsights(filters = {}) {
    try {
      const data = await sessionService.getClickMap(filters)

      this.insights = data
    } catch (e) {
      console.error(e)
    }
  }

  setFunnelPage(page = {}) {
    this.funnelPage = page || false
  }

  /* @deprecated */
  setTimelinePointer(pointer: {}) {
    this.timelinePointer = pointer
  }

  setTimelineTooltip(tp: { time: number, offset: number, isVisible: boolean, localTime: string, userTime?: string }) {
    this.timeLineTooltip = tp
  }

  setEditNoteTooltip(tp: { time: number, isVisible: boolean, isEdit: boolean, note: any }) {
    this.createNoteTooltip = tp
  }

  filterOutNote(noteId: string) {
    const current = this.current

    current.notesWithEvents = current.notesWithEvents.filter(n => {
      if ('noteId' in item) {
        return item.noteId !== noteId
      }
      return true
    })

    this.current = current
  }

  addNote(note: Note) {
    const current = this.current

    current.notesWithEvents.push(note)
    current.notesWithEvents.sort((a,b) => {
      const aTs = a.time || a.timestamp
      const bTs = b.time || b.timestamp

      return aTs - bTs
    })

    this.current = current
  }

  updateNote(note: Note) {
    const noteIndex = this.current.notesWithEvents.findIndex(item => {
        if ('noteId' in item) {
          return item.noteId === note.noteId
        }
        return false
      })

    this.current.notesWithEvents[noteIndex] = note
  }

  setSessionPath(path = {}) {
    this.sessionPath = path
  }

  setLastPlayed(sessionId: string) {
    const list = this.list
    const sIndex = list.findIndex((s) => s.sessionId === sessionId)
    if (sIndex !== -1) {
      this.list[sIndex].viewed = true
    }
  }

}
