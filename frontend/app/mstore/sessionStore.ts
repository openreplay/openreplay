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
import { List, Record } from 'immutable';
import { filterMap } from 'App/mstore/searchStore';

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

export default class SessionStore {
  userFilter: UserFilter = new UserFilter();
  list: Session[] = [];
  sessionIds: string[] = [];
  current = new Session();
  total = 0;
  totalLiveSessions = 0;
  favoriteList: Session[] = [];
  activeTab = { name: 'All', type: 'all' }
  timezone = 'local';
  errorStack: ErrorStack[] = [];
  eventsIndex: number[] = [];
  sourcemapUploaded = true;
  filteredEvents: InjectedEvent[] | null = null;
  eventsQuery = '';
  liveSessions: Session[] = [];
  visitedEvents: Location[] = [];
  insights: any[] = [];
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
  createNoteTooltip = { time: 0, isVisible: false, isEdit: false, note: null };
  previousId = '';
  nextId = '';
  userTimezone = '';
  prefetchedMobUrls: Record<string, { data: Uint8Array; entryNum: number }> = {};
  prefetched: boolean = false;
  fetchFailed: boolean = false;
  loadingLiveSessions: boolean = false;
  loadingSessions: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Set User Timezone
  setUserTimezone(timezone: string) {
    this.userTimezone = timezone;
  }

  resetUserFilter() {
    this.userFilter = new UserFilter();
  }

  // Get First Mob (Mobile) File
  async getFirstMob(sessionId: string) {
    const { domURL } = await sessionService.getFirstMobUrl(sessionId);
    await loadFile(domURL[0], (data) => this.setPrefetchedMobUrl(sessionId, data));
  }

  // Set Prefetched Mobile URL
  setPrefetchedMobUrl(sessionId: string, fileData: Uint8Array) {
    const keys = Object.keys(this.prefetchedMobUrls);
    const toLimit = 10 - keys.length;
    if (toLimit < 0) {
      const oldest = keys.sort(
        (a, b) =>
          this.prefetchedMobUrls[a].entryNum - this.prefetchedMobUrls[b].entryNum
      )[0];
      delete this.prefetchedMobUrls[oldest];
    }
    const nextEntryNum =
      keys.length > 0
      ? Math.max(...keys.map((key) => this.prefetchedMobUrls[key].entryNum || 0)) + 1
      : 0;
    this.prefetchedMobUrls[sessionId] = {
      data: fileData,
      entryNum: nextEntryNum,
    };
  }

  // Get Sessions (Helper Function)
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
    runInAction(() => {
      this.loadingLiveSessions = true;
    })
    try {
      const data = await sessionService.getLiveSessions(params);
      this.liveSessions = data.sessions.map((session) => new Session({ ...session, live: true }));
      this.totalLiveSessions = data.total;
    } catch (e) {
      console.error(e);
    } finally {
      runInAction(() => {
        this.loadingLiveSessions = false;
      });
    }
  }

  async fetchSessions(params = {}, force = false) {
    runInAction(() => {
      this.loadingSessions = true;
    })
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

      this.list = list;
      this.total = data.total;
      this.sessionIds = data.sessions.map((s) => s.sessionId);
      this.favoriteList = list.filter((s) => s.favorite);
    } catch (e) {
      console.error(e);
    } finally {
      runInAction(() => {
        this.loadingSessions = false;
      });
    }
  }

  // Fetch Session Data (Info and Events)
  async fetchSessionData(sessionId: string, isLive = false) {
    try {
      const filter = useReducerData('filters.appliedFilter');
      const data = await sessionService.getSessionInfo(sessionId, isLive);
      this.current = new Session(data);

      const eventsData = await sessionService.getSessionEvents(sessionId);

      const {
        errors,
        events,
        issues,
        crashes,
        resources,
        stackEvents,
        userEvents,
        userTesting,
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

      this.current = this.current.addEvents(
        events,
        crashes,
        errors,
        issues,
        resources,
        userEvents,
        stackEvents,
        userTesting
      );
      this.eventsIndex = matching;
      this.visitedEvents = visitedEvents;
      this.host = visitedEvents[0]?.host || '';
    } catch (e) {
      console.error(e);
      this.fetchFailed = true;
    }
  }

  // Fetch Notes
  async fetchNotes(sessionId: string) {
    try {
      const notes = await sessionService.getSessionNotes(sessionId);
      if (notes.length > 0) {
        this.current = this.current.addNotes(notes);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Fetch Favorite List
  async fetchFavoriteList() {
    try {
      const data = await sessionService.getFavoriteSessions();
      this.favoriteList = data.map((s: any) => new Session(s));
    } catch (e) {
      console.error(e);
    }
  }

  // Fetch Session Clickmap
  async fetchSessionClickmap(sessionId: string, params: any) {
    try {
      const data = await sessionService.getSessionClickmap(sessionId, params);
      this.insights = data;
    } catch (e) {
      console.error(e);
    }
  }

  // Set Autoplay Values
  setAutoplayValues() {
    const currentId = this.current.sessionId;
    const currentIndex = this.sessionIds.indexOf(currentId);

    this.previousId = this.sessionIds[currentIndex - 1] || '';
    this.nextId = this.sessionIds[currentIndex + 1] || '';
  }

  // Set Event Query
  setEventQuery(filter: { query: string }) {
    const events = this.current.events;
    const query = filter.query;
    const searchRe = getRE(query, 'i');

    const filteredEvents = query
                           ? events.filter(
        (e) =>
          searchRe.test(e.url) ||
          searchRe.test(e.value) ||
          searchRe.test(e.label) ||
          searchRe.test(e.type) ||
          (e.type === 'LOCATION' && searchRe.test('visited'))
      )
                           : null;

    this.filteredEvents = filteredEvents;
    this.eventsQuery = query;
  }

  // Toggle Favorite
  async toggleFavorite(id: string) {
    try {
      const r = await sessionService.toggleFavorite(id);
      if (r.success) {
        const list = this.list;
        const current = this.current;
        const sessionIdx = list.findIndex(({ sessionId }) => sessionId === id);
        const session = list[sessionIdx];
        const wasInFavorite =
          this.favoriteList.findIndex(({ sessionId }) => sessionId === id) > -1;

        if (session) {
          session.favorite = !wasInFavorite;
          this.list[sessionIdx] = session;
        }
        if (current.sessionId === id) {
          this.current.favorite = !wasInFavorite;
        }

        if (wasInFavorite) {
          this.favoriteList = this.favoriteList.filter(
            ({ sessionId }) => sessionId !== id
          );
        } else {
          this.favoriteList.push(session);
        }
      } else {
        console.error(r);
      }
    } catch (e) {
      console.error(e);
    }
  }

  sortSessions(sortKey: string, sign: number = 1) {
    const comparator = (s1: Session, s2: Session) => {
      // @ts-ignore
      let diff = s1[sortKey] - s2[sortKey];
      diff = diff === 0 ? s1.startedAt - s2.startedAt : diff;
      return sign * diff;
    };

    this.list = this.list.slice().sort(comparator);
    this.favoriteList = this.favoriteList.slice().sort(comparator);
  }

  // Set Active Tab
  setActiveTab(tab: { type: string, name: string }) {
    const list =
      tab.type === 'all'
      ? this.list
      : this.list.filter((s) => s.issueTypes.includes(tab.type));

    this.activeTab = tab;
    this.sessionIds = list.map((s) => s.sessionId);
  }

  // Set Timezone
  setTimezone(tz: string) {
    this.timezone = tz;
  }

  // Fetch Insights
  async fetchInsights(params = {}) {
    try {
      const data = await sessionService.getClickMap(params);
      this.insights = data.sort((a: any, b: any) => b.count - a.count);
    } catch (e) {
      console.error(e);
    }
  }

  setTimelineTooltip(tp: {
    time: number;
    offset: number;
    isVisible: boolean;
    localTime: string;
    userTime?: string;
  }) {
    this.timeLineTooltip = tp;
  }

  // Set Create Note Tooltip
  setCreateNoteTooltip(noteTooltip: any) {
    this.createNoteTooltip = noteTooltip;
  }

  // Set Edit Note Tooltip
  setEditNoteTooltip(noteTooltip: any) {
    this.createNoteTooltip = noteTooltip;
  }

  // Filter Out Note
  filterOutNote(noteId: string) {
    this.current.notesWithEvents = this.current.notesWithEvents.filter((item) => {
      if ('noteId' in item) {
        return item.noteId !== noteId;
      }
      return true;
    });
  }

  // Update Note
  updateNote(note: Note) {
    const noteIndex = this.current.notesWithEvents.findIndex((item) => {
      if ('noteId' in item) {
        return item.noteId === note.noteId;
      }
      return false;
    });

    if (noteIndex !== -1) {
      this.current.notesWithEvents[noteIndex] = note;
    }
  }

  // Set Session Path
  setSessionPath(path = {}) {
    // this.sessionPath = path;
  }

  updateLastPlayedSession(sessionId: string) {
    const sIndex = this.list.findIndex((s) => s.sessionId === sessionId);
    if (sIndex !== -1) {
      this.list[sIndex].viewed = true;
    }
  }

  // Clear Current Session
  clearCurrentSession() {
    this.current = new Session();
    this.eventsIndex = [];
    this.visitedEvents = [];
    this.host = '';
  }

  prefetchSession(sessionData: Session) {
    this.current = sessionData;
    this.prefetched = true;
  }

  setCustomSession(session: Session) {
    this.current = session;
    // If additional filter logic is needed, implement here
  }

  customSetSessions(data: any) {
    this.liveSessions = data.sessions.map((s: any) => new Session(s));
    this.totalLiveSessions = data.total
  }

  clearList() {
    this.list = [];
    this.total = 0;
    this.sessionIds = [];
  }
}

// Helper function to simulate useReducerData
function useReducerData(path: string): any {
  // Implement this function based on your application's context
  // For now, we'll return an empty object
  return {};
}
