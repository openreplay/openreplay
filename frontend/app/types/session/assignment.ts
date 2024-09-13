import Activity, { IActivity } from './activity';
import { DateTime } from 'luxon';
import {  notEmptyString } from 'App/validate';

interface IReportedIssue {
  id: string;
  title: string;
  timestamp: number;
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

export default class ReportedIssue {
  id: IReportedIssue["id"];
  title: IReportedIssue["title"] = '';
  timestamp: IReportedIssue["timestamp"];
  sessionId: IReportedIssue["sessionId"];
  projectId: IReportedIssue["projectId"] = '';
  siteId: IReportedIssue["siteId"];
  activities: IReportedIssue["activities"];
  closed: IReportedIssue["closed"];
  assignee: IReportedIssue["assignee"] = '';
  issueType: IReportedIssue["issueType"] = '';
  description: IReportedIssue["description"] = '';
  iconUrl: IReportedIssue["iconUrl"] = '';

  constructor(assignment?: IReportedIssue) {
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