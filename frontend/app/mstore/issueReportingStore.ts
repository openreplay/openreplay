import { makeAutoObservable } from 'mobx';
import { issueReportsService } from 'App/services';
import ReportedIssue from '../types/session/assignment';

export default class IssueReportingStore {
  instance!: ReportedIssue;

  issueTypes: any[] = [];

  list: any[] = [];

  issueTypeIcons: Record<string, string> = {};

  users: any[] = [];

  projects: any[] = [];

  issuesFetched = false;

  projectsFetched = false;

  projectsLoading = false;

  metaLoading = false;

  createLoading = false;

  constructor() {
    makeAutoObservable(this);
    // void makePersistable(this, {
    //   name: 'IssueReportingStore',
    //   properties: ['issueTypes', 'list', 'projects', 'users', 'projectsFetched', 'issuesFetched', 'issueTypeIcons'],
    //   expireIn: 60000 * 10,
    //   removeOnExpiration: true,
    //   storage: window.localStorage
    // });
  }

  init = (instanceData: any) => {
    this.instance = new ReportedIssue(instanceData);
    if (this.issueTypes.length > 0) {
      this.instance.issueType = this.issueTypes[0].id;
    }
  };

  editInstance = (data: Partial<ReportedIssue>) => {
    Object.assign(this.instance, data);
  };

  setList = (list: any[]) => {
    this.list = list;
    this.issuesFetched = true;
  };

  setProjects = (projects: any[]) => {
    this.projectsFetched = true;
    this.projects = projects;
  };

  setMeta = (data: any) => {
    const issueTypes = data.issueTypes || [];
    const itIcons: Record<string, string> = {};
    issueTypes.forEach((it: any) => {
      itIcons[it.id] = it.iconUrl;
    });
    this.issueTypes = issueTypes;
    this.issueTypeIcons = itIcons;
    this.users = data.users || [];
  };

  fetchProjects = async () => {
    if (this.projectsLoading || this.projects.length > 0) return;
    this.projectsLoading = true;
    try {
      const { data } = await issueReportsService.fetchProjects();
      this.setProjects(data);
      this.projectsFetched = true;
      return data;
    } catch (e) {
      console.error(e);
    } finally {
      this.projectsLoading = false;
    }
  };

  fetchMeta = async (projectId: number) => {
    if (this.metaLoading) return;
    this.metaLoading = true;
    try {
      const { data } = await issueReportsService.fetchMeta(projectId);
      this.setMeta(data);
    } catch (e) {
      console.error(e);
    } finally {
      this.metaLoading = false;
    }
  };

  saveIssue = async (sessionId: string, instance: ReportedIssue) => {
    if (this.createLoading) return;
    this.createLoading = true;
    try {
      const payload = {
        ...instance,
        assignee: `${instance.assignee}`,
        issueType: `${instance.issueType}`,
      };
      const resp = await issueReportsService.saveIssue(sessionId, payload);
      // const resp = await issueReportsService.saveIssue(sessionId, instance.toCreate());

      // const { data: issue } = await issueReportsService.saveIssue(sessionId, payload);
      this.init(resp.data.issue);
    } catch (e) {
      throw e;
      // console.error(e);
    } finally {
      this.createLoading = false;
    }
  };

  fetchList = async (sessionId: string) => {
    try {
      const { data } =
        await issueReportsService.fetchIssueIntegrations(sessionId);
      this.setList(data);
    } catch (e) {
      console.error(e);
    }
  };
}
