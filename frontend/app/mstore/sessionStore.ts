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
  insights = []
  insightFilters = defaultDateFilters
  host = ''
  funnelPage = {}
  timelinePointer = null
  sessionPath =  {}
  lastPlayedSessionId: string
  timeLineTooltip = { time: 0, offset: 0, isVisible: false, timeStr: '' }
  createNoteTooltip = { time: 0, isVisible: false, isEdit: false, note: null }
  previousId = ''
  nextId = ''

  constructor() {
    makeAutoObservable(this, {
      userFilter: observable,
      devTools: observable,
    });
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
            sessions: response.sessions.map((session: any) => new Session().fromJson(session)),
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
    } catch(e) {
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
    } catch(e) {
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
}
