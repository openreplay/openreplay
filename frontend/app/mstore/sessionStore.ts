import { action, makeAutoObservable, observable, runInAction } from 'mobx';
import { sessionService } from 'App/services';
import { Note } from 'App/services/NotesService';
import Session from 'Types/session';
import ErrorStack from 'Types/session/errorStack';
import { InjectedEvent, Location } from 'Types/session/event';
import {
  cleanSessionFilters,
  compareJsonObjects,
  getRE,
  getSessionFilter,
  setSessionFilter,
} from 'App/utils';
import { loadFile } from 'App/player/web/network/loadFiles';
import { LAST_7_DAYS } from 'Types/app/period';
import { filterMap } from 'App/mstore/searchStore';
import { getDateRangeFromValue } from 'App/dateRange';
import { searchStore, searchStoreLive } from './index';
const range = getDateRangeFromValue(LAST_7_DAYS);

const defaultDateFilters = {
  url: '',
  rangeValue: LAST_7_DAYS,
  startDate: range.start?.toMillis(),
  endDate: range.end?.toMillis(),
};

class UserFilter {
  endDate: number = new Date().getTime();

  startDate: number = new Date().getTime() - 24 * 60 * 60 * 1000;

  rangeName: string = LAST_7_DAYS;

  filters: any = [];

  page: number = 1;

  limit: number = 10;

  period: any = { rangeName: LAST_7_DAYS };

  constructor() {
    makeAutoObservable(this);
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
    this.network = {
      index: 0,
      filter: '',
      activeTab: 'ALL',
      isError: false,
    };
    this.stackEvent = {
      index: 0,
      filter: '',
      activeTab: 'ALL',
      isError: false,
    };
    this.console = {
      index: 0,
      filter: '',
      activeTab: 'ALL',
      isError: false,
    };
    makeAutoObservable(this, {
      update: action,
    });
  }

  update(key: string, value: any) {
    // @ts-ignore
    this[key] = Object.assign(this[key], value);
  }
}

interface Bookmarks {
  list: Session[];
  page: number;
  total: number;
  pageSize: number;
  loading: boolean;
}

export default class SessionStore {
  userFilter: UserFilter = new UserFilter();

  devTools: DevTools = new DevTools();

  list: Session[] = [];

  bookmarks: Bookmarks = {
    list: [],
    page: 1,
    total: 0,
    pageSize: 10,
    loading: false,
  };

  sessionIds: string[] = [];

  current = new Session();

  total = 0;

  totalLiveSessions = 0;

  favoriteList: Session[] = [];

  activeTab = { name: 'All', type: 'all' };

  timezone = 'local';

  errorStack: ErrorStack[] = [];

  eventsIndex: number[] = [];

  sourcemapUploaded = true;

  filteredEvents: InjectedEvent[] | null = null;

  eventsQuery = '';

  liveSessions: Session[] = [];

  visitedEvents: Location[] = [];

  insights: any[] = [];

  insightsFilters = defaultDateFilters;

  host = '';

  sessionPath: Record<string, any> = {};

  lastPlayedSessionId: string = '';

  timeLineTooltip = {
    time: 0,
    offset: 0,
    isVisible: false,
    localTime: '',
    userTime: '',
  };

  createNoteTooltip = {
    time: 0,
    isVisible: false,
    isEdit: false,
    note: null,
  };

  previousId = '';

  nextId = '';

  userTimezone = '';

  prefetchedMobUrls: Record<string, { data: Uint8Array; entryNum: number, fileKey?: string }> =
    {};

  prefetched: boolean = false;

  fetchFailed: boolean = false;

  loadingLiveSessions: boolean = false;

  loadingSessions: boolean = false;

  loadingSessionData: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  get currentId() {
    return this.current.sessionId;
  }

  setUserTimezone = (timezone: string) => {
    this.userTimezone = timezone;
  };

  resetUserFilter = () => {
    this.userFilter = new UserFilter();
  };

  getFirstMob = async (sessionId: string) => {
    const { domURL, fileKey } = await sessionService.getFirstMobUrl(sessionId);
    await loadFile(domURL[0], (data) =>
      this.setPrefetchedMobUrl(sessionId, data, fileKey),
    );
  };

  setPrefetchedMobUrl = (sessionId: string, fileData: Uint8Array, fileKey?: string) => {
    const keys = Object.keys(this.prefetchedMobUrls);
    const toLimit = 10 - keys.length;
    if (toLimit < 0) {
      const oldest = keys.sort(
        (a, b) =>
          this.prefetchedMobUrls[a].entryNum -
          this.prefetchedMobUrls[b].entryNum,
      )[0];
      delete this.prefetchedMobUrls[oldest];
    }
    const nextEntryNum =
      keys.length > 0
        ? Math.max(
            ...keys.map((key) => this.prefetchedMobUrls[key]?.entryNum || 0),
          ) + 1
        : 0;
    this.prefetchedMobUrls[sessionId] = {
      data: fileData,
      fileKey,
      entryNum: nextEntryNum,
    };
  };

  getSessions = (filter: any): Promise<any> =>
    new Promise((resolve, reject) => {
      sessionService
        .getSessions(filter.toJson?.() || filter)
        .then((response: any) => {
          resolve({
            sessions: response.sessions.map(
              (session: any) => new Session(session),
            ),
            total: response.total,
          });
        })
        .catch((error: any) => {
          reject(error);
        });
    });

  fetchLiveSessions = async (params: any = {}) => {
    runInAction(() => {
      this.loadingLiveSessions = true;
    });
    try {
      if (params.sort === 'duration') {
        // TODO ui hack to sort by duration, should be removed once the api addressed this issue
        params.sort = 'timestamp';
        params.order = params.order === 'asc' ? 'desc' : 'asc';
      }
      const data: any = await sessionService.getLiveSessions(params);
      this.liveSessions = data.sessions.map(
        (session: any) => new Session({ ...session, live: true }),
      );
      this.totalLiveSessions = data.total;
    } catch (e) {
      console.error(e);
    } finally {
      runInAction(() => {
        this.loadingLiveSessions = false;
      });
    }
  };

  fetchSessions = async (params = {}, force = false) => {
    runInAction(() => {
      this.loadingSessions = true;
    });
    try {
      if (!force) {
        const oldFilters = getSessionFilter();
        if (compareJsonObjects(oldFilters, cleanSessionFilters(params))) {
          return;
        }
      }
      setSessionFilter(cleanSessionFilters(params));
      const data = await sessionService.getSessions(params);
      const list = data.sessions.map((s) => new Session(s));
      runInAction(() => {
        this.list = list;
        this.total = data.total;
        this.sessionIds = data.sessions.map((s) => s.sessionId);
        this.favoriteList = list.filter((s) => s.favorite);
      });
    } catch (e) {
      console.error(e);
    } finally {
      runInAction(() => {
        this.loadingSessions = false;
      });
    }
  };

  clearAll = () => {
    this.list = [];
    this.clearCurrentSession();
  };

  fetchSessionData = async (sessionId: string, isLive = false) => {
    try {
      const filter = isLive ? searchStoreLive.instance : searchStore.instance;
      const data = await sessionService.getSessionInfo(sessionId, isLive);
      const eventsData: Record<string, any[]> = {};
      try {
        const evData = await sessionService.getSessionEvents(sessionId);
        Object.assign(eventsData, evData);
      } catch (e) {
        console.error('Failed to fetch events', e);
      }

      const {
        errors = [],
        events = [],
        issues = [],
        crashes = [],
        resources = [],
        stackEvents = [],
        userEvents = [],
        userTesting = [],
      } = eventsData;

      const filterEvents = filter.events as Record<string, any>[];
      const matching: number[] = [];

      const visitedEvents: Location[] = [];
      const tmpMap = new Set();

      events.forEach((event) => {
        if (event.type === 'LOCATION' && !tmpMap.has(event.url)) {
          tmpMap.add(event.url);
          visitedEvents.push(event as Location);
        }
      });

      filterEvents.forEach(({ key, operator, value }) => {
        events.forEach((e, index) => {
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

      runInAction(() => {
        const session = new Session(data);
        session.addEvents(
          events,
          crashes,
          errors,
          issues,
          resources,
          userEvents,
          stackEvents,
          userTesting,
        );
        this.current = session;
        this.eventsIndex = matching;
        this.visitedEvents = visitedEvents;
        this.host = visitedEvents[0]?.host || '';
        this.prefetched = false;
      });
    } catch (e) {
      console.error(e);
      this.fetchFailed = true;
    }
  };

  fetchNotes = async (sessionId: string) => {
    try {
      const notes = await sessionService.getSessionNotes(sessionId);
      if (notes.length > 0) {
        this.current = this.current.addNotes(notes);
      }
    } catch (e) {
      console.error(e);
    }
  };

  fetchFavoriteList = async () => {
    try {
      const data = await sessionService.getFavoriteSessions();
      this.favoriteList = data.map((s: any) => new Session(s));
    } catch (e) {
      console.error(e);
    }
  };

  fetchSessionClickmap = async (sessionId: string, params: any) => {
    try {
      const data = await sessionService.getSessionClickMap(sessionId, params);
      this.insights = data;
    } catch (e) {
      console.error(e);
    }
  };

  setAutoplayValues = () => {
    const currentId = this.current.sessionId;
    const currentIndex = this.sessionIds.indexOf(currentId);

    this.previousId = this.sessionIds[currentIndex - 1] || '';
    this.nextId = this.sessionIds[currentIndex + 1] || '';
  };

  setEventQuery = (filter: { query: string }) => {
    const { events } = this.current;
    const { query } = filter;
    const searchRe = getRE(query, 'i');

    const filteredEvents = query
      ? events.filter(
          (e) =>
            searchRe.test(e.url) ||
            searchRe.test(e.value) ||
            searchRe.test(e.label) ||
            searchRe.test(e.type) ||
            (e.type === 'LOCATION' && searchRe.test('visited')),
        )
      : null;

    this.filteredEvents = filteredEvents;
    this.eventsQuery = query;
  };

  toggleFavorite = async (id: string) => {
    try {
      const r = await sessionService.toggleFavorite(id);
      if (r.ok) {
        const { list } = this;
        const { current } = this;
        const sessionIdx = list.findIndex(({ sessionId }) => sessionId === id);
        const session = list[sessionIdx];
        const wasInFavorite =
          this.favoriteList.findIndex(({ sessionId }) => sessionId === id) > -1;

        runInAction(() => {
          if (session) {
            session.favorite = !wasInFavorite;
            this.list[sessionIdx] = session;
          }
          if (current.sessionId === id) {
            this.current.favorite = !wasInFavorite;
          }

          if (wasInFavorite) {
            this.favoriteList = this.favoriteList.filter(
              ({ sessionId }) => sessionId !== id,
            );
          } else {
            this.favoriteList.push(session);
          }
        });
      } else {
        console.error(r);
      }
    } catch (e) {
      console.error(e);
    }
  };

  sortSessions = (sortKey: string, sign: number = 1) => {
    const comparator = (s1: Session, s2: Session) => {
      // @ts-ignore
      let diff = s1[sortKey] - s2[sortKey];
      diff = diff === 0 ? s1.startedAt - s2.startedAt : diff;
      return sign * diff;
    };

    this.list = this.list.slice().sort(comparator);
    this.favoriteList = this.favoriteList.slice().sort(comparator);
  };

  setActiveTab = (tab: { type: string; name: string }) => {
    const list =
      tab.type === 'all'
        ? this.list
        : this.list.filter((s) => s.issueTypes.includes(tab.type));

    this.activeTab = tab;
    this.sessionIds = list.map((s) => s.sessionId);
  };

  setTimezone = (tz: string) => {
    this.timezone = tz;
  };

  fetchInsights = async (params = {}) => {
    try {
      const data = await sessionService.getClickMap(params);
      this.insights = data.sort((a: any, b: any) => b.count - a.count);
    } catch (e) {
      console.error(e);
    }
  };

  setTimelineTooltip = (tp: {
    time: number;
    offset: number;
    isVisible: boolean;
    localTime: string;
    userTime?: string;
  }) => {
    this.timeLineTooltip = tp;
  };

  setCreateNoteTooltip = (noteTooltip: any) => {
    this.createNoteTooltip = noteTooltip;
  };

  setEditNoteTooltip = (noteTooltip: any) => {
    this.createNoteTooltip = noteTooltip;
  };

  filterOutNote = (noteId: string) => {
    this.current.notesWithEvents = this.current.notesWithEvents.filter(
      (item) => {
        if ('noteId' in item) {
          return item.noteId !== noteId;
        }
        return true;
      },
    );
  };

  updateNote = (note: Note) => {
    const noteIndex = this.current.notesWithEvents.findIndex((item) => {
      if ('noteId' in item) {
        return item.noteId === note.noteId;
      }
      return false;
    });

    if (noteIndex !== -1) {
      this.current.notesWithEvents[noteIndex] = note;
    }
  };

  setSessionPath = (path = {}) => {
    this.sessionPath = path;
  };

  updateLastPlayedSession = (sessionId: string) => {
    const sIndex = this.list.findIndex((s) => s.sessionId === sessionId);
    if (sIndex !== -1) {
      this.list[sIndex].viewed = true;
    }
  };

  clearCurrentSession = () => {
    this.current = new Session();
    this.eventsIndex = [];
    this.visitedEvents = [];
    this.host = '';
  };

  prefetchSession = (sessionData: Session) => {
    this.current = sessionData;
    this.prefetched = true;
  };

  customSetSessions = (data: any) => {
    this.liveSessions = data.sessions.map((s: any) => new Session(s));
    this.totalLiveSessions = data.total;
  };

  fetchAutoplayList = async (page: number) => {
    try {
      const filter = searchStore.instance.toSearch();
      setSessionFilter(cleanSessionFilters(filter));
      const data = await sessionService.getAutoplayList({ ...filter, page });
      const ids = data
        .map((i: any) => `${i.sessionId}`)
        .filter((i, index) => !this.sessionIds.includes(i));
      this.sessionIds = this.sessionIds.concat(ids);
    } catch (e) {
      console.error(e);
    }
  };

  clearList = () => {
    this.list = [];
    this.total = 0;
    this.sessionIds = [];
    this.bookmarks = {
      list: [],
      page: 1,
      total: 0,
      pageSize: 10,
      loading: false,
    };
  };

  setLastPlayedSessionId = (sessionId: string) => {
    this.lastPlayedSessionId = sessionId;
  };

  async fetchBookmarkedSessions() {
    try {
      this.bookmarks.loading = true;
      const params = {
        page: this.bookmarks.page,
        limit: this.bookmarks.pageSize,
        bookmarked: true,
      };
      const data = await sessionService.getSessions(params);
      this.bookmarks.list = data.sessions.map((s: any) => new Session(s));
      this.bookmarks.total = data.total;
    } catch (e) {
      console.error(e);
    } finally {
      this.bookmarks.loading = false;
    }
  }

  updateBookmarksPage(page: number) {
    this.bookmarks.page = page;
    void this.fetchBookmarkedSessions();
  }
}
