import { List, Map, Set } from 'immutable';
import Assignment from 'Types/session/assignment';
import Activity from 'Types/session/activity';
import withRequestState, { RequestTypes } from './requestStateCreator';
import { createListUpdater, createItemInListUpdater } from './funcTools/tools';
import { editType, initType } from './funcTools/crud/types';
import { createInit, createEdit } from './funcTools/crud';
import IssuesType from 'Types/issue/issuesType'

const idKey = 'id';
const name = 'assignment';
const listUpdater = createListUpdater(idKey);

const FETCH_PROJECTS = new RequestTypes('asignment/FETCH_PROJECTS');
const FETCH_META = new RequestTypes('asignment/FETCH_META');
const FETCH_ASSIGNMENTS = new RequestTypes('asignment/FETCH_ASSIGNMENTS');
const FETCH_ASSIGNMENT = new RequestTypes('asignment/FETCH_ASSIGNMENT');
const ADD_ACTIVITY = new RequestTypes('asignment/ADD_ACTIVITY');
const ADD_MESSAGE = new RequestTypes('asignment/ADD_MESSAGE');
const EDIT = editType(name);
const INIT = initType(name);

const initialState = Map({
  list: List(),
  instance: Assignment(),
  activeIssue: Assignment(),
  issueTypes: List(),
  issueTypeIcons: Set(),
  users: List(),
  projects: List(),
  projectsFetched: false
});

const reducer = (state = initialState, action = {}) => {
  const users = state.get('users');
  var issueTypes = []
  switch (action.type) {
    case INIT:
      action.instance.issueType = issueTypes.length > 0 ? issueTypes[0].id : '';
      return state.set('instance', Assignment(action.instance));
    case EDIT:
      return state.mergeIn([ 'instance' ], action.instance);
    case FETCH_PROJECTS.SUCCESS:
      return state.set('projects', List(action.data)).set('projectsFetched', true);
    case FETCH_ASSIGNMENTS.SUCCESS:      
      return state.set('list', List(action.data.issues).map(Assignment));
    case FETCH_ASSIGNMENT.SUCCESS:
      return state.set('activeIssue', Assignment({ ...action.data, users}));
    case FETCH_META.SUCCESS:
      issueTypes = List(action.data.issueTypes).map(IssuesType);
      var issueTypeIcons = {}
      // for (var i =0; i < issueTypes.length; i++) {
      //   issueTypeIcons[issueTypes[i].id] = issueTypes[i].iconUrl
      // }
      issueTypes.forEach(iss => {
        issueTypeIcons[iss.id] = iss.iconUrl
      })
      return state.set('issueTypes', issueTypes)
        .set('users', List(action.data.users))
        .set('issueTypeIcons', issueTypeIcons)
    case ADD_ACTIVITY.SUCCESS:
      const instance = Assignment(action.data);
      return listUpdater(state, instance);
    case ADD_MESSAGE.SUCCESS:
      const user = users.filter(user => user.id === action.data.author).first();
      const activity = Activity({ type: 'message', user, ...action.data,});
      return state.updateIn([ 'activeIssue', 'activities' ], list => list.push(activity));
    default:
      return state;
  }
};

export default withRequestState({
  fetchProjects: FETCH_PROJECTS,
  fetchMeta: FETCH_META,
  fetchAssignments: FETCH_ASSIGNMENTS,
  addActivity: ADD_ACTIVITY,
  fetchAssignment: FETCH_ASSIGNMENT,
  addMessage: ADD_MESSAGE
}, reducer);

export const init = createInit(name);
export const edit = createEdit(name);

export function fetchProjects(sessionId) {
  return {
    types: FETCH_PROJECTS.toArray(),
    call: client => client.get(`/integrations/issues/list_projects`)
  };
}

export function fetchMeta(projectId) {
  return {
    types: FETCH_META.toArray(),
    call: client => client.get(`/integrations/issues/${projectId}`)
  }
}

export function fetchAssignments(sessionId) {
  return {
    types: FETCH_ASSIGNMENTS.toArray(),
    call: client => client.get(`/sessions2/${ sessionId }/assign`)
  }
}

export function fetchAssigment(sessionId, id) {
  return {
    types: FETCH_ASSIGNMENT.toArray(),
    call: client => client.get(`/sessions2/${ sessionId }/assign/${ id }`)
  }
}

export function addActivity(sessionId, params) {
  return {
    types: ADD_ACTIVITY.toArray(),
    call: client => client.post(`/sessions2/${ sessionId }/assign/projects/${params.projectId}`, params.toCreate()),
  }
}

export function addMessage(sessionId, assignmentId, params) {
  return {
    types: ADD_MESSAGE.toArray(),
    call: client => client.post(`/sessions2/${ sessionId }/assign/${ assignmentId }/comment`, params),
  }
}