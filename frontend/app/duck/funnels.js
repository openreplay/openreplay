import { List, Map } from 'immutable';
import Funnel from 'Types/funnel';
import FunnelIssue from 'Types/funnelIssue';
import Session from 'Types/session';
import { fetchListType, fetchType, saveType, editType, initType, removeType } from './funcTools/crud/types';
import { createItemInListUpdater, mergeReducers, success, array } from './funcTools/tools';
import { createRequestReducer } from './funcTools/request';
import { getDateRangeFromValue } from 'App/dateRange';
import { LAST_7_DAYS } from 'Types/app/period';
import { filterMap, checkFilterValue, hasFilterApplied } from './search';

const name = 'funnel';
const idKey = 'funnelId';
const itemInListUpdater = createItemInListUpdater(idKey);

const FETCH_LIST = fetchListType('funnel/FETCH_LIST');
const FETCH_ISSUES = fetchType('funnel/FETCH_ISSUES');
const FETCH_ISSUE = fetchType('funnel/FETCH_ISSUE');
const FETCH_ISSUE_TYPES = fetchType('funnel/FETCH_ISSUE_TYPES');
const FETCH_SESSIONS = fetchType('funnel/FETCH_SESSIONS');
const FETCH = fetchType('funnel/FETCH');
const FETCH_INSIGHTS = fetchType('funnel/FETCH_INSIGHTS');
const SAVE = saveType('funnel/SAVE');
const UPDATE = saveType('funnel/UPDATE');
const EDIT = editType('funnel/EDIT');
const EDIT_FILTER = `${name}/EDIT_FILTER`;
const EDIT_FUNNEL_FILTER = `${name}/EDIT_FUNNEL_FILTER`;
const REMOVE = removeType('funnel/REMOVE');
const INIT = initType('funnel/INIT');
const SET_NAV_REF = 'funnels/SET_NAV_REF'

const RESET_FUNNEL = 'funnels/RESET_FUNNEL'
const APPLY_FILTER = 'funnels/APPLY_FILTER'
const APPLY_ISSUE_FILTER = 'funnels/APPLY_ISSUE_FILTER'
const REMOVE_ISSUE_FILTER = 'funnels/REMOVE_ISSUE_FILTER'
const SET_ACTIVE_STAGES = 'funnels/SET_ACTIVE_STAGES'
const SET_SESSIONS_SORT = 'funnels/SET_SESSIONS_SORT'
const BLINK = 'funnels/BLINK'

const RESET_ISSUE = 'funnles/RESET_ISSUE'

const FETCH_LIST_SUCCESS = success(FETCH_LIST);
const FETCH_ISSUES_SUCCESS = success(FETCH_ISSUES);
const FETCH_ISSUE_SUCCESS = success(FETCH_ISSUE);
const FETCH_ISSUE_TYPES_SUCCESS = success(FETCH_ISSUE_TYPES);
const FETCH_SESSIONS_SUCCESS = success(FETCH_SESSIONS);
const FETCH_SUCCESS = success(FETCH);
const FETCH_INSIGHTS_SUCCESS = success(FETCH_INSIGHTS);
const SAVE_SUCCESS = success(SAVE);
const UPDATE_SUCCESS = success(UPDATE);
const REMOVE_SUCCESS = success(REMOVE);

const range = getDateRangeFromValue(LAST_7_DAYS);
const defaultDateFilters = {
  rangeValue: LAST_7_DAYS,
  startDate: range.start.unix() * 1000,
  endDate: range.end.unix() * 1000
}

const initialState = Map({
  list: List(),  
  instance: Funnel(),
  insights: Funnel(),
  issues: List(),
  issue: FunnelIssue(),
  issuesTotal: 0,
  sessionsTotal: 0,
  sessions: List(),
  activeStages: List(),
  funnelFilters: Map(defaultDateFilters),
  sessionsSort: Map({ order: "desc", sort: "newest" }),
  issueFilters: Map({
    filters: List(),
    sort: { order: "desc", sort: "lostConversions" }
  }),
  sessionFilters: defaultDateFilters,
  navRef: null,
  issueTypes: List(),
  blink: true
});

const reducer = (state = initialState, action = {}) => {
	switch(action.type) {
    case BLINK:
      return state.set('blink', action.state);
    case EDIT:
      return state.mergeIn([ 'instance' ], action.instance);
    case EDIT_FILTER:
      return state.mergeIn([ 'instance', 'filter' ], action.instance);
    case EDIT_FUNNEL_FILTER:
      return state.mergeIn([ 'funnelFilters' ], action.instance);
    case INIT:
      return state.set('instance', Funnel(action.instance))
		case FETCH_LIST_SUCCESS:
      return state.set('list', List(action.data).map(Funnel)) 
		case FETCH_ISSUES_SUCCESS:
      return state
        .set('issues', List(action.data.issues.significant).map(FunnelIssue))
        .set('criticalIssuesCount', action.data.issues.criticalIssuesCount)
		case FETCH_SESSIONS_SUCCESS:      
      return state
        .set('sessions', List(action.data.sessions).map(s => new Session(s)))
        .set('total', action.data.total)
    case FETCH_ISSUE_SUCCESS:      
      return state
        .set('issue', FunnelIssue(action.data.issue))
        .set('sessions', List(action.data.sessions.sessions).map(s => new Session(s)))
        .set('sessionsTotal', action.data.sessions.total)
    case RESET_ISSUE:
      return state.set('isses', FunnelIssue())
        .set('sections', List())
        .set('sessionsTotal', 0);
    case FETCH_SUCCESS:
      const funnel = Funnel(action.data);
      return state.set('instance', funnel)
    case FETCH_ISSUE_TYPES_SUCCESS:
      const tmpMap = {};
      action.data.forEach(element => {
        tmpMap[element.type] = element.title        
      });
      return state
        .set('issueTypes', List(action.data.map(({ type, title }) => ({ text: title, value: type }))))
        .set('issueTypesMap', tmpMap);
    case FETCH_INSIGHTS_SUCCESS:
      let stages = [];
      if (action.isRefresh) {
        const activeStages = state.get('activeStages');
        const oldInsights = state.get('insights');
        const lastStage = action.data.stages[action.data.stages.length - 1]
        const lastStageIndex = activeStages.toJS()[1];
        stages = oldInsights.stages.map((stage, i) => {
          stage.dropDueToIssues = lastStageIndex === i ? lastStage.dropDueToIssues : 0;
          return stage;
        });
        return state.set('insights', Funnel({ totalDropDueToIssues: action.data.totalDropDueToIssues, stages, activeStages: activeStages.toJS() }));
      } else {
        stages = action.data.stages.map((stage, i) => {
          stage.dropDueToIssues = 0;
          return stage;
        });
        return state.set('insights', Funnel({ ...action.data, stages }))
      }
    case SAVE_SUCCESS:
    case UPDATE_SUCCESS:
      return state.update('list', itemInListUpdater(CustomField(action.data)))
    case REMOVE_SUCCESS:
      return state.update('list', list => list.filter(item => item.index !== action.index));
    case APPLY_FILTER:      
      return state.mergeIn([ action.filterType ], Array.isArray(action.filter) ? action.filter : Map(action.filter));
    case APPLY_ISSUE_FILTER:      
      return state.mergeIn(['issueFilters'], action.filter)
    case REMOVE_ISSUE_FILTER:      
      return state.updateIn(['issueFilters', 'filters'], list => list.filter(item => item !== action.errorType))
    case SET_ACTIVE_STAGES:
      return state.set('activeStages', List(action.stages))
    case SET_NAV_REF:
      return state.set('navRef', action.navRef);
    case SET_SESSIONS_SORT:
      const comparator = (s1, s2) => {
        let diff = s1[ action.sortKey ] - s2[ action.sortKey ];
        diff = diff === 0 ? s1.startedAt - s2.startedAt : diff;
        return action.sign * diff;
      };      
      return state
        .update('sessions', list => list.sort(comparator))
        .set('sessionsSort', { sort: action.sort, sign: action.sign });
    case RESET_FUNNEL:
      return state        
        .set('instance', Funnel())
        .set('activeStages', List())
        .set('issuesSort', Map({}))
        // .set('funnelFilters', Map(defaultDateFilters))
        .set('insights', Funnel())
        .set('issues', List())
        .set('sessions', List());
		default:
			return state;
	}
}

export const fetchList = (range) => {
  return {
    types: array(FETCH_LIST),
    call: client => client.get(`/funnels`),
  }
}

export const fetch = (funnelId, params) => (dispatch, getState) => {
  return dispatch({
    types: array(FETCH),
    call: client => client.get(`/funnels/${funnelId}`, params)
  });
}

// const eventMap = ({value, type, key, operator, source, custom}) => ({value, type, key, operator, source, custom});
// const filterMap = ({value, type, key, operator, source, custom }) => ({value: Array.isArray(value) ? value: [value], custom, type, key, operator, source});

function getParams(params, state) {
  const filter = state.getIn([ 'funnels', 'instance', 'filter']).toData();
  filter.filters = filter.filters.map(filterMap);
  const funnelFilters = state.getIn([ 'funnels', 'funnelFilters']).toJS();

  // const appliedFilter = state.getIn([ 'funnels', 'instance', 'filter' ]);
  // const filter = appliedFilter
  //   .update('events', list => list.map(event => event.set('value', event.value || '*')).map(eventMap))
  //   .toJS();
  
  // filter.filters = state.getIn([ 'funnelFilters', 'appliedFilter', 'filters' ])
  //   .map(filterMap).toJS();

  return { ...filter, ...funnelFilters };
}

export const fetchInsights = (funnelId, params = {}, isRefresh = false) => (dispatch, getState) => {  
  return dispatch({
    types: array(FETCH_INSIGHTS),
    call: client => client.post(`/funnels/${funnelId}/insights`, getParams(params, getState())),
    isRefresh
  })
}


export const fetchFiltered = (funnelId, params) => (dispatch, getState) => {
  return dispatch({
    types: array(FETCH),
    call: client => client.post(`/funnels/${funnelId}`, params),
  })
}

export const fetchIssuesFiltered = (funnelId, params) => (dispatch, getState) => {  
  return dispatch({
    types: array(FETCH_ISSUES),
    call: client => client.post(`/funnels/${funnelId}/issues`, getParams(params, getState())),
  })
}

export const fetchSessionsFiltered = (funnelId, params) => (dispatch, getState) => {
  return dispatch({
    types: array(FETCH_SESSIONS),
    call: client => client.post(`/funnels/${funnelId}/sessions`, getParams(params, getState())),
  })
}

export const fetchIssue = (funnelId, issueId, params) => (dispatch, getState) => {
  const filters = getState().getIn([ 'funnelFilters', 'appliedFilter' ]);  
  const _params = { ...filters.toData(), ...params };
  return dispatch({
    types: array(FETCH_ISSUE),
    call: client => client.post(`/funnels/${funnelId}/issues/${issueId}/sessions`, _params),
  })
}

export const fetchIssues = (funnelId, params) => {
  return {
    types: array(FETCH_ISSUES),
    call: client => client.get(`/funnels/${funnelId}/issues`, params),
  }
}

export const fetchSessions = (funnelId, params) => {
  return {
    types: array(FETCH_SESSIONS),
    call: client => client.get(`/funnels/${funnelId}/sessions`, params),
  }
}

export const fetchIssueTypes = () => {
  return {
    types: array(FETCH_ISSUE_TYPES),
    call: client => client.get(`/funnels/issue_types`),
  }
}

export const save = () => (dispatch, getState) => {
  const instance = getState().getIn([ 'funnels', 'instance'])
  const filter = instance.get('filter').toData();
  filter.filters = filter.filters.map(filterMap);
  const isExist = instance.exists();

  const _instance = instance instanceof Funnel ? instance : Funnel(instance);
  const url = isExist ? `/funnels/${ _instance[idKey] }` : `/funnels`;

  return dispatch({
    types: array(isExist ? SAVE : UPDATE),
    call: client => client.post(url, { ..._instance.toData(), filter }),
  });
}

export const updateFunnelFilters = (funnelId, filter) => {  
  return {
    types: array(UPDATE),
    call: client => client.post(`/funnels/${funnelId}`, { filter }),
  }
}

export const remove = (index) => {
  return {
    types: array(REMOVE),
    call: client => client.delete(`/funnels/${index}`),
    index,
  }
}

export const applyFilter = (filterType='funnelFilters', filter) => {  
  return {
    type: APPLY_FILTER,
    filter,
    filterType,    
  }
};

export const applyIssueFilter = (filter) => {
  return {
    type: APPLY_ISSUE_FILTER,
    filter
  }
};

export const removeIssueFilter = errorType => {
  return {
    type: REMOVE_ISSUE_FILTER,
    errorType,
  }
};

export const setActiveStages = (stages, filters, funnelId, forceRrefresh = false) => (dispatch, getState) => { 
  dispatch({
    type: SET_ACTIVE_STAGES,
    stages,
  })

  if (stages.length === 2) {
    const filter = {...filters.toData(), firstStage: stages[0] + 1, lastStage: stages[1] + 1 };
    dispatch(fetchIssuesFiltered(funnelId, filter))
    dispatch(fetchInsights(funnelId, filter, true));
    dispatch(fetchSessionsFiltered(funnelId, filter));
  } else if (forceRrefresh) {    
    const filter = {...filters.toData()};
    dispatch(fetchIssuesFiltered(funnelId, filter))
    dispatch(fetchInsights(funnelId, filter));
    dispatch(fetchSessionsFiltered(funnelId, filter));
  }
};

export const edit = instance => {
  return {
    type: EDIT,
    instance,
  }
};

export const init = instance => {
  return {
    type: INIT,
    instance,
  }
};

export const setNavRef = ref => {
  return {
    type: SET_NAV_REF,
    navRef: ref
  }
};

export const resetIssue = () => {  
  return {
    type: RESET_ISSUE,    
  }
}

export const resetFunnel = () => {  
  return {
    type: RESET_FUNNEL,
  }
}

export const setSessionsSort = (sortKey, sign = 1) => {  
  return {
    type: SET_SESSIONS_SORT,    
    sortKey,
    sign
  }
}

export const blink = (state = true) => {
  return {
    type: BLINK,
    state
  }
}

export const refresh = (funnelId) => (dispatch, getState) => {
  // dispatch(fetch(funnelId))
  dispatch(fetchInsights(funnelId))
  dispatch(fetchIssuesFiltered(funnelId, {}))
  dispatch(fetchSessionsFiltered(funnelId, {}))
}

export default mergeReducers(
	reducer,
	createRequestReducer({
    fetchRequest: FETCH,
    fetchListRequest: FETCH_LIST,
    fetchInsights: FETCH_INSIGHTS,
    fetchIssueRequest: FETCH_ISSUE,
    saveRequest: SAVE,
    updateRequest: UPDATE,
    fetchIssuesRequest: FETCH_ISSUES,
    fetchSessionsRequest: FETCH_SESSIONS,
  }),	
)

const reduceThenFetchList = actionCreator => (...args) => (dispatch, getState) => {
  dispatch(actionCreator(...args));
  dispatch(refresh(getState().getIn([ 'funnels', 'instance', idKey ])));

  // const filter = getState().getIn([ 'funnels', 'instance', 'filter']).toData();
  // filter.filters = filter.filters.map(filterMap);

  // return dispatch(fetchSessionList(filter));
};


export const editFilter = reduceThenFetchList((instance) => ({
  type: EDIT_FILTER,
  instance,
}));

export const editFunnelFilter = reduceThenFetchList((instance) => ({
  type: EDIT_FUNNEL_FILTER,
  instance,
}));

export const addFilter = (filter) => (dispatch, getState) => {
  filter.value = checkFilterValue(filter.value);
  const instance = getState().getIn([ 'funnels', 'instance', 'filter']);

  if (hasFilterApplied(instance.filters, filter)) {
    
  } else {
    const filters = instance.filters.push(filter);
    return dispatch(editFilter(instance.set('filters', filters)));
  }
}

export const addFilterByKeyAndValue = (key, value) => (dispatch, getState) => {
  let defaultFilter = filtersMap[key];
  defaultFilter.value = value;
  dispatch(addFilter(defaultFilter));
}