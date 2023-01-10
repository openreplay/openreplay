import Assignment from 'Types/session/assignment';
import Activity from 'Types/session/activity';
import { List, Map, Set } from 'immutable';
import withRequestState, { RequestTypes } from 'Duck/requestStateCreator';
import { createListUpdater } from './funcTools/tools';
import { editType, initType } from './funcTools/crud/types';
import { createInit, createEdit } from './funcTools/crud';

const idKey = 'id';
const name = 'assignment';
const listUpdater = createListUpdater(idKey);

const FETCH_ASSIGNMENTS = new RequestTypes('asignment/FETCH_ASSIGNMENTS');
const FETCH_ISSUE = new RequestTypes('asignment/FETCH_ISSUE');
const FETCH_PROJECTS = new RequestTypes('asignment/FETCH_PROJECTS');
const FETCH_META = new RequestTypes('asignment/FETCH_META');
const ADD_ACTIVITY = new RequestTypes('asignment/ADD_ACTIVITY');
const ADD_MESSAGE = new RequestTypes('asignment/ADD_MESSAGE');
const EDIT = editType(name);
const INIT = initType(name);
const RESET_ACTIVE_ISSUE = 'assignment/RESET_ACTIVE_ISSUE';

const initialState = Map({
  list: List(),
  instance: new Assignment(),
  activeIssue: new Assignment(),
  issueTypes: List(),
  issueTypeIcons: Set(),
  users: List(),
  projects: List()
});

let issueTypes = [];

const reducer = (state = initialState, action = {}) => {
  const users = state.get('users');
  switch (action.type) {
    case FETCH_PROJECTS.SUCCESS:
      return state.set('projects', List(action.data));
    case FETCH_ASSIGNMENTS.SUCCESS:
      return state.set('list', action.data.map(as => new Assignment(as)));
    case ADD_ACTIVITY.SUCCESS:
      const instance = new Assignment(action.data);
      return listUpdater(state, instance);
    case FETCH_META.SUCCESS:
      issueTypes = action.data.issueTypes;
      var issueTypeIcons = {}
      for (var i =0; i < issueTypes.length; i++) {
        issueTypeIcons[issueTypes[i].id] = issueTypes[i].iconUrl
      }
      return state.set('issueTypes', List(issueTypes))
        .set('users', List(action.data.users))
        .set('issueTypeIcons', issueTypeIcons)
    case FETCH_ISSUE.SUCCESS:
      return state.set('activeIssue', new Assignment({ ...action.data, users}));
    case RESET_ACTIVE_ISSUE:
      return state.set('activeIssue', new Assignment());
    case ADD_MESSAGE.SUCCESS:
      const user = users.filter(user => user.id === action.data.author).first();
      const activity = new Activity({ type: 'message', user, ...action.data,});
      return state.updateIn([ 'activeIssue', 'activities' ], list => list.push(activity));
    case INIT:
      action.instance.issueType = issueTypes.length > 0 ? issueTypes[0].id : '';
      return state.set('instance', new Assignment(action.instance));
    case EDIT:
      return state.mergeIn([ 'instance' ], action.instance);
    default:
      return state;
  }
};

export default withRequestState({
  fetchListRequest: FETCH_ASSIGNMENTS,
  addActivityRequest: ADD_ACTIVITY,
  fetchIssueRequest: FETCH_ISSUE,
  addMessageRequest: ADD_MESSAGE,
  fetchProjectsRequest: FETCH_PROJECTS
}, reducer);

export const init = createInit(name);
export const edit = createEdit(name);

export function fetchAssignments(sessionId) {
  return {
    types: FETCH_ASSIGNMENTS.toArray(),
    call: client => client.get(`/sessions/${ sessionId }/assign`)
  }
}

export function resetActiveIsue() {
  return {
    type: RESET_ACTIVE_ISSUE
  }
}

export function fetchProjects() {
  return {
    types: FETCH_PROJECTS.toArray(),
    call: client => client.get(`/integrations/issues/list_projects`)
  }
}

export function fetchMeta(projectId) {
  return {
    types: FETCH_META.toArray(),
    call: client => client.get(`/integrations/issues/${projectId}`)
  }
}

export function addActivity(sessionId, params) {
  return {
    types: ADD_ACTIVITY.toArray(),
    call: client => client.post(`/sessions/${ sessionId }/assign`, params.toCreate()),
  }
}

export function addMessage(sessionId, assignmentId, params) {
  return {
    types: ADD_MESSAGE.toArray(),
    call: client => client.post(`/sessions/${ sessionId }/assign/${ assignmentId }/comment`, params),
  }
}
