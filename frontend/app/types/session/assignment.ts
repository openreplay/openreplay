import Activity, { IActivity } from './activity';
import { DateTime } from 'luxon';
import {  notEmptyString } from 'App/validate';

interface IAssignment {
  id: string;
  title: string;
  timestamp: number;
  creatorId: string;
  sessionId: string;
  projectId: string;
  siteId: string;
  activities: [];
  closed: boolean;
  assignee: string;
  commentsCount: number;
  issueType: string;
  description: string;
  iconUrl: string;
  createdAt?: string;
  comments: IActivity[]
  users: { id: string }[]
}

export default class Assignment {
  id: IAssignment["id"];
  title: IAssignment["title"] = '';
  timestamp: IAssignment["timestamp"];
  creatorId: IAssignment["creatorId"];
  sessionId: IAssignment["sessionId"];
  projectId: IAssignment["projectId"] = '';
  siteId: IAssignment["siteId"];
  activities: IAssignment["activities"];
  closed: IAssignment["closed"];
  assignee: IAssignment["assignee"] = '';
  commentsCount: IAssignment["commentsCount"];
  issueType: IAssignment["issueType"] = '';
  description: IAssignment["description"] = '';
  iconUrl: IAssignment["iconUrl"] = '';

  constructor(assignment?: IAssignment) {
    if (assignment) {
      Object.assign(this, {
        ...assignment,
        timestamp: assignment.createdAt ? DateTime.fromISO(assignment.createdAt) : undefined,
        activities: assignment.comments ? assignment.comments.map(activity => {
          if (assignment.users) {
            // @ts-ignore ???
            activity.user = assignment.users.filter(user => user.id === activity.author)[0];
          }
          return new Activity(activity)
        }) : []
      })
    }
  }

  toJS() {
    return this
  }

  validate() {
    return !!this.projectId && !!this.issueType && notEmptyString(this.title) && notEmptyString(this.description)
  }

  get isValid() {
    return !!this.projectId && !!this.issueType && notEmptyString(this.title) && notEmptyString(this.description)
  }

  toCreate() {
    return {
      title: this.title,
      description: this.description,
      assignee: this.assignee,
      issueType: this.issueType
    }
  }
}