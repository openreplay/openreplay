import { makeAutoObservable } from 'mobx';
import { DateTime } from 'luxon';
import { notEmptyString } from 'App/validate';
import Activity, { IActivity } from './activity';

export interface IReportedIssue {
  id: string;
  title: string;
  timestamp: number | null;
  sessionId: string;
  projectId: string;
  siteId: string;
  activities: any[];
  closed: boolean;
  assignee: string;
  commentsCount: number;
  issueType: string;
  description: string;
  iconUrl: string;
  createdAt?: string;
  comments: IActivity[];
  users: { id: string }[];
}

export default class ReportedIssue {
  id: IReportedIssue['id'] = '';

  title: IReportedIssue['title'] = '';

  timestamp: DateTime | null = null;

  sessionId: IReportedIssue['sessionId'] = '';

  projectId: IReportedIssue['projectId'] = '';

  siteId: IReportedIssue['siteId'] = '';

  activities: any[] = [];

  closed: IReportedIssue['closed'] = false;

  assignee: IReportedIssue['assignee'] = '';

  issueType: IReportedIssue['issueType'] = '';

  description: IReportedIssue['description'] = '';

  iconUrl: IReportedIssue['iconUrl'] = '';

  constructor(assignment?: IReportedIssue) {
    makeAutoObservable(this);
    if (assignment) {
      Object.assign(this, assignment);
      this.timestamp = assignment.createdAt
        ? DateTime.fromISO(assignment.createdAt)
        : null;
      this.activities = assignment.comments
        ? assignment.comments.map((activity) => {
            if (assignment.users) {
              // @ts-ignore
              activity.user = assignment.users.find(
                (user) => user.id === activity.author,
              );
            }
            return new Activity(activity);
          })
        : [];
    }
  }

  validate() {
    return (
      !!this.projectId &&
      !!this.issueType &&
      notEmptyString(this.title) &&
      notEmptyString(this.description)
    );
  }

  get isValid() {
    return this.validate();
  }

  toCreate() {
    return {
      title: this.title,
      description: this.description,
      assignee: `${this.assignee}`,
      issueType: `${this.issueType}`,
      projectId: this.projectId,
    };
  }
}
