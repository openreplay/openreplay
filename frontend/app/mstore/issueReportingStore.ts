import { makeAutoObservable } from 'mobx';
import ReportedIssue from "../types/session/assignment";
import { issueReportsService } from "App/services";

export default class issueReportingStore {
  instance: ReportedIssue
  issueTypes: any[] = []
  list: any[] = []
  issueTypeIcons: {}
  users: any[] = []
  projects: any[] = []
  issuesFetched = false
  projectsFetched = false
  projectsLoading = false
  metaLoading = false
  createLoading = false

  constructor() {
    makeAutoObservable(this);
  }

  init = (instance: any) => {
    this.instance = new ReportedIssue(instance);
    if (this.issueTypes.length > 0) {
      this.instance.issueType = this.issueTypes[0].id;
    }
  }

  editInstance = (data: any) => {
    const inst = this.instance
    this.instance = new ReportedIssue({ ...inst, ...data })
  }

  setList = (list: any[]) => {
    this.list = list;
    this.issuesFetched = true
  }

  setProjects = (projects: any[]) => {
    this.projectsFetched = true;
    this.projects = projects;
  }

  setMeta = (data: any) => {
    const issueTypes = data.issueTypes || [];
    const itIcons = {}
    issueTypes.forEach((it: any) => {
      itIcons[it.id] = it.iconUrl
    })

    this.issueTypes = issueTypes;
    this.issueTypeIcons = itIcons;
    this.users = data.users || [];
  }

  fetchProjects = async () => {
    if (this.projectsLoading) return;
    this.projectsLoading = true;
    try {
      const { data } = await issueReportsService.fetchProjects();
      this.setProjects(data);
      this.projectsFetched = true;
      return data;
    } catch (e) {
      console.error(e)
    } finally {
      this.projectsLoading = false;
    }
  }

  fetchMeta = async (projectId: number) => {
    if (this.metaLoading) return;
    this.metaLoading = true;
    try {
      const { data } = await issueReportsService.fetchMeta(projectId);
      this.setMeta(data);
    } catch (e) {
      console.error(e)
    } finally {
      this.metaLoading = false;
    }
  }

  saveIssue = async (sessionId: string, params: any) => {
    if (this.createLoading) return;
    this.createLoading = true;
    try {
      const data = { ...params, assignee: params.assignee, issueType: params.issueType }
      const { data: issue } = await issueReportsService.saveIssue(sessionId, data);
      this.init(issue)
    } catch (e) {
      console.error(e)
    } finally {
      this.createLoading = false;
    }
  }

  fetchList = async (sessionId: string) => {
    try {
      const { data } = await issueReportsService.fetchIssueIntegrations(sessionId);
      this.setList(data);
    } catch (e) {
      console.error(e)
    }
  }
}