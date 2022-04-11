import { List, Map } from 'immutable';
import Session from 'Types/session';
import ErrorStack from 'Types/session/errorStack';
import Watchdog, { getSessionWatchdogTypes } from 'Types/watchdog';
import { clean as cleanParams } from 'App/api_client';
import withRequestState, { RequestTypes } from './requestStateCreator';
import { getRE } from 'App/utils';
import { LAST_7_DAYS } from 'Types/app/period';
import { getDateRangeFromValue } from 'App/dateRange';

const INIT = 'sessions/INIT';

const FETCH_LIST = new RequestTypes('sessions/FETCH_LIST');
const FETCH = new RequestTypes('sessions/FETCH');
const FETCH_FAVORITE_LIST = new RequestTypes('sessions/FETCH_FAVORITE_LIST');
const FETCH_LIVE_LIST = new RequestTypes('sessions/FETCH_LIVE_LIST');
const TOGGLE_FAVORITE = new RequestTypes('sessions/TOGGLE_FAVORITE');
const FETCH_ERROR_STACK = new RequestTypes('sessions/FETCH_ERROR_STACK');
const FETCH_INSIGHTS = new RequestTypes('sessions/FETCH_INSIGHTS');
const SORT = 'sessions/SORT';
const REDEFINE_TARGET = 'sessions/REDEFINE_TARGET';
const SET_TIMEZONE = 'sessions/SET_TIMEZONE';
const SET_EVENT_QUERY = 'sessions/SET_EVENT_QUERY';
const SET_AUTOPLAY_VALUES = 'sessions/SET_AUTOPLAY_VALUES';
const TOGGLE_CHAT_WINDOW = 'sessions/TOGGLE_CHAT_WINDOW';
const SET_FUNNEL_PAGE_FLAG = 'sessions/SET_FUNNEL_PAGE_FLAG';
const SET_TIMELINE_POINTER = 'sessions/SET_TIMELINE_POINTER';
const SET_SESSION_PATH = 'sessions/SET_SESSION_PATH';

const SET_ACTIVE_TAB = 'sessions/SET_ACTIVE_TAB';

const range = getDateRangeFromValue(LAST_7_DAYS);
const defaultDateFilters = {  
  url: '',
  rangeValue: LAST_7_DAYS,
  startDate: range.start.unix() * 1000,
  endDate: range.end.unix() * 1000
}

const initialState = Map({
  list: List(),
  sessionIds: [],
  current: Session(),
  total: 0,
  keyMap: Map(),
  wdTypeCount: Map(),
  favoriteList: List(),
  activeTab: Watchdog({name: 'All', type: 'all' }),
  timezone: 'local',
  errorStack: List(),
  eventsIndex: [],
  sourcemapUploaded: true,
  filteredEvents: null,
  showChatWindow: false,
  liveSessions: List(),
  visitedEvents: List(),
  insights: List(),
  insightFilters: defaultDateFilters,
  host: '',
  funnelPage: Map(),
  timelinePointer: null,
  sessionPath: '',
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case INIT:
      return state.set('current', Session(action.session));
    case FETCH_LIST.REQUEST:
      return action.clear
        ? state
          .set('list', List())
        : state;
    case FETCH_ERROR_STACK.SUCCESS:
      return state.set('errorStack', List(action.data.trace).map(ErrorStack)).set('sourcemapUploaded', action.data.sourcemapUploaded)
    case FETCH_LIVE_LIST.SUCCESS:
      const liveList = List(action.data).map(s => new Session({...s, live: true}));
      return state
        .set('liveSessions', liveList)
    case FETCH_LIST.SUCCESS:
      const { sessions, total } = action.data;
      const list = List(sessions).map(Session);

      const { params } = action;
      const eventProperties = {
        eventCount: 0,
        eventTypes: [],
        dateFilter: params.rangeValue,
        filterKeys: Object.keys(params)
          .filter(key => ![ 'custom', 'startDate', 'endDate', 'strict', 'key', 'events', 'rangeValue' ].includes(key)),
        returnedCount: list.size,
        totalSearchCount: total,
      };
      if (Array.isArray(params.events)) {
        eventProperties.eventCount = params.events.length;
        params.events.forEach(({ type }) => {
          if (!eventProperties.eventTypes.includes(type)) {
            eventProperties.eventTypes.push(type);
          }
        })
      }

      const keyMap = {}
      list.forEach(s => {
        s.issueTypes.forEach(k => {
          if(keyMap[k])
            keyMap[k] += 1
          else
            keyMap[k] = 1;
        })
      })

      const wdTypeCount = {} 
      try{
        list.forEach(s => {
          getSessionWatchdogTypes(s).forEach(wdtp => {
            wdTypeCount[wdtp] = wdTypeCount[wdtp] ? wdTypeCount[wdtp] + 1 : 1;
          })
        })
      } catch(e) {

      }

      const sessionIds = list.map(({ sessionId }) => sessionId ).toJS();

      return state
        .set('list', list)
        .set('sessionIds', sessionIds)
        .set('favoriteList', list.filter(({ favorite }) => favorite))
        .set('total', total)
        .set('keyMap', keyMap)
        .set('wdTypeCount', wdTypeCount);
    case SET_AUTOPLAY_VALUES: {
      const sessionIds = state.get('sessionIds')
      const currentSessionId = state.get('current').sessionId
      const currentIndex = sessionIds.indexOf(currentSessionId)
      return state
        .set('previousId', sessionIds[currentIndex - 1])
        .set('nextId', sessionIds[currentIndex + 1]);
    }
    case SET_EVENT_QUERY: {      
      const events = state.get('current').events;      
      const query = action.filter.query;
      // const filter = action.filter.filter;
      const searchRe = getRE(query, 'i');
      let filteredEvents = query ? events.filter(e => searchRe.test(e.url) || searchRe.test(e.value) || searchRe.test(e.label)) : null;
      
      // if (filter) {
      //   filteredEvents = filteredEvents ? filteredEvents.filter(e => e.type === filter) : events.filter(e => e.type === filter);
      // }      
      return state.set('filteredEvents', filteredEvents)
    }
    case FETCH.SUCCESS: {      
      // TODO: more common.. or TEMP      
      const events = action.filter.events;
      // const filters = action.filter.filters;
      const current = state.get('list').find(({ sessionId }) => sessionId === action.data.sessionId) || Session();
      const session = Session(action.data);
    
      const matching = [];

      const visitedEvents = []
      const tmpMap = {}
      session.events.forEach(event => {
        if (event.type === 'LOCATION' && !tmpMap.hasOwnProperty(event.url)) {          
          tmpMap[event.url] = event.url
          visitedEvents.push(event)
        } 
      })      
      
      events.forEach(({ key, operator, value }) => {        
        session.events.forEach((e, index) => {
          if (key === e.type) {
            const val = (e.type === 'LOCATION' ? e.url : e.value);
            if (operator === 'is' && value === val) {
              matching.push(index);
            }
            if (operator === 'contains' && val.includes(value)) {
              matching.push(index);
            }            
          }         
        })
      })      
      return state.set('current', current.merge(session))
        .set('eventsIndex', matching)
        .set('visitedEvents', visitedEvents)
        .set('host', visitedEvents[0] && visitedEvents[0].host);
    }
    case FETCH_FAVORITE_LIST.SUCCESS:    
      return state
        .set('favoriteList', List(action.data).map(Session));
    case TOGGLE_FAVORITE.SUCCESS: {
      const id = action.sessionId;
      const session = state.get('list').find(({sessionId}) => sessionId === id)
      const wasInFavorite = state
        .get('favoriteList').findIndex(({ sessionId }) => sessionId === id) > -1;
      
      return state
        .update('list', list => list
          .map(session => (session.sessionId === id
            ? session.set('favorite', !wasInFavorite)
            : session)))
        .update('favoriteList', list => (wasInFavorite
          ? list.filter(({ sessionId }) => sessionId !== id)
          : list.push(session.set('favorite', true))))
        .update('current', session => (session.sessionId === id
          ? session.set('favorite', !wasInFavorite)
          : session));
    }
    case SORT: {
      const comparator = (s1, s2) => {
        let diff = s1[ action.sortKey ] - s2[ action.sortKey ];
        diff = diff === 0 ? s1.startedAt - s2.startedAt : diff;
        return action.sign * diff;
      };
      return state
        .update('list', list => list.sort(comparator))
        .update('favoriteList', list => list.sort(comparator));
    }
    case REDEFINE_TARGET: {
      // TODO: update for list
      const {
        label,
        path,
      } = action.target;
      return state.updateIn([ 'current', 'events' ], list =>
        list.map(event => (event.target && event.target.path === path
          ? event.setIn([ 'target', 'label' ], label)
          : event)));
    }
    case SET_ACTIVE_TAB:
      const allList = action.tab.type === 'all' ? 
        state.get('list') :
        state.get('list').filter(s => s.issueTypes.includes(action.tab.type))
      
      return state
        .set('activeTab', action.tab)
        .set('sessionIds', allList.map(({ sessionId }) => sessionId ).toJS())
    case SET_TIMEZONE:
      return state.set('timezone', action.timezone)
    case TOGGLE_CHAT_WINDOW:
      return state.set('showChatWindow', action.state)
    case FETCH_INSIGHTS.SUCCESS:       
      return state.set('insights', List(action.data).sort((a, b) => b.count - a.count));
    case SET_FUNNEL_PAGE_FLAG:
      return state.set('funnelPage', action.funnelPage ? Map(action.funnelPage) : false);
    case SET_TIMELINE_POINTER:
      return state.set('timelinePointer', action.pointer);
    case SET_SESSION_PATH:
      return state.set('sessionPath', action.path);
    default:
      return state;
  }
};

export default withRequestState({
  _: [ FETCH, FETCH_LIST ],
  fetchLiveListRequest: FETCH_LIVE_LIST,
  fetchFavoriteListRequest: FETCH_FAVORITE_LIST,
  toggleFavoriteRequest: TOGGLE_FAVORITE,
  fetchErrorStackList: FETCH_ERROR_STACK,
  fetchInsightsRequest: FETCH_INSIGHTS,
}, reducer);

function init(session) {
  return {
    type: INIT,
    session,
  }
}

export const fetchList = (params = {}, clear = false, live = false) => (dispatch, getState) => {
  return dispatch({
    types: FETCH_LIST.toArray(),
    call: client => client.post('/sessions/search2', params),
    clear,
    params: cleanParams(params),
  })
}

export function fetchErrorStackList(sessionId, errorId) {
  return {
    types: FETCH_ERROR_STACK.toArray(),
    call: client => client.get(`/sessions2/${ sessionId }/errors/${ errorId }/sourcemaps`)
  };
}

export const fetch = (sessionId, isLive = false) => (dispatch, getState) => {
  console.log('isLive', isLive)
  dispatch({
    types: FETCH.toArray(),
    call: client => client.get(isLive ? `/assist/sessions/${ sessionId }` : `/sessions2/${ sessionId }`),
    filter: getState().getIn([ 'filters', 'appliedFilter' ])
  });
}

export function toggleFavorite(sessionId) {
  return {
    types: TOGGLE_FAVORITE.toArray(),
    call: client => client.get(`/sessions2/${ sessionId }/favorite`),
    sessionId,
  };
}

export function fetchFavoriteList() {
  return {
    types: FETCH_FAVORITE_LIST.toArray(),
    call: client => client.get('/sessions2/favorite'),
  };
}

export function fetchInsights(params) {  
  return {
    types: FETCH_INSIGHTS.toArray(),
    call: client => client.post('/heatmaps/url', params),
  };
}

export function fetchLiveList() {
  return {
    types: FETCH_LIVE_LIST.toArray(),
    call: client => client.get('/assist/sessions'),
  };
}

export function toggleChatWindow(state) {
  return {
    type: TOGGLE_CHAT_WINDOW,
    state
  };
}

export function sort(sortKey, sign = 1, listName = 'list') {
  return {
    type: SORT,
    sortKey,
    sign,
    listName,
  };
}

export function redefineTarget(target) {
  return {
    type: REDEFINE_TARGET,
    target,
  };
}

export const setAutoplayValues = (sessionId) => {
  return {
    type: SET_AUTOPLAY_VALUES,
    sessionId,
  };
}

export const setActiveTab = (tab) => ({
  type: SET_ACTIVE_TAB,
  tab
})

export function setTimezone(timezone) {
  return {
    type: SET_TIMEZONE,
    timezone,
  };
}

export function setEventFilter(filter) {
  return {
    type: SET_EVENT_QUERY,
    filter
  }
}

export function setFunnelPage(funnelPage) {
  return {
    type: SET_FUNNEL_PAGE_FLAG,
    funnelPage
  }
}

export function setTimelinePointer(pointer) {
  return {
    type: SET_TIMELINE_POINTER,
    pointer
  }
}

export function setSessionPath(path) {
  return {
    type: SET_SESSION_PATH,
    path
  }
}