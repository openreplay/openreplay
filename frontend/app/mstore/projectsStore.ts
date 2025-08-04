import { makeAutoObservable, runInAction } from 'mobx';
import {
  GLOBAL_HAS_NO_RECORDINGS,
  SITE_ID_STORAGE_KEY,
} from 'App/constants/storageKeys';
import { projectsService } from 'App/services';
import GDPR from './types/gdpr';
import Project from './types/project';

interface Config {
  project: Project | null;
  pid: number | undefined;
  tab: string;
}

export default class ProjectsStore {
  list: Project[] = [];

  instance: Project | null = null;

  siteId: string | null = null;

  active: Project | null = null;

  sitesLoading = true;

  loading = false;

  config: Config = {
    project: null,
    pid: undefined,
    tab: 'installation',
  };

  constructor() {
    const storedSiteId = localStorage.getItem(SITE_ID_STORAGE_KEY);
    this.siteId = storedSiteId ?? null;
    makeAutoObservable(this);
  }

  get isMobile() {
    return this.active
      ? ['ios', 'android'].includes(this.active.platform)
      : false;
  }

  get activeSiteId() {
    return this.active?.id || this.siteId;
  }

  syncProjectInList = (project: Partial<Project>) => {
    const index = this.list.findIndex((site) => site.id === project.id);
    if (index !== -1) {
      this.list[index] = this.list[index].edit(project);
    }
  };

  getSiteId = () => ({
    siteId: this.siteId,
    active: this.active,
  });

  initProject = (project: Partial<Project>) => {
    this.instance = new Project(project);
  };

  setSitesLoading = (loading: boolean) => {
    this.sitesLoading = loading;
  };

  setLoading = (loading: boolean) => {
    this.loading = loading;
  };

  setSiteId = (siteId: string) => {
    localStorage.setItem(SITE_ID_STORAGE_KEY, siteId.toString());
    this.siteId = siteId;
    this.active = this.list.find((site) => site.id! === siteId) ?? null;
  };

  editGDPR = (gdprData: Partial<GDPR>) => {
    if (this.instance) {
      const oldInstance = this.instance.gdpr;
      this.instance.gdpr = new GDPR({
        ...oldInstance.toData(),
        ...gdprData,
      });
    }
  };

  editInstance = (instance: Partial<Project>) => {
    if (!this.instance) return;
    this.instance = this.instance.edit(instance);
  };

  fetchGDPR = async (siteId: string) => {
    try {
      const response = await projectsService.fetchGDPR(siteId);
      runInAction(() => {
        if (this.instance) {
          Object.assign(this.instance.gdpr, response.data);
        }
      });
    } catch (error) {
      console.error('Failed to fetch GDPR:', error);
    }
  };

  saveGDPR = async (siteId: string) => {
    if (!this.instance) return;
    try {
      const gdprData = this.instance.gdpr.toData();
      const response = await projectsService.saveGDPR(siteId, gdprData);
      this.editGDPR(response.data);

      try {
        this.syncProjectInList({
          id: siteId,
          gdpr: response.data,
        });
      } catch (error) {
        console.error('Failed to sync project in list:', error);
      }
    } catch (error) {
      console.error('Failed to save GDPR:', error);
    }
  };

  fetchList = async (siteIdFromPath?: string) => {
    this.setSitesLoading(true);
    try {
      const response = await projectsService.fetchList();
      runInAction(() => {
        this.list = response.data.map((data) => new Project(data));
        const siteIds = this.list.map((site) => site.id);
        let { siteId } = this;
        const siteExists = siteId ? siteIds.includes(siteId) : false;

        if (siteIdFromPath && siteIds.includes(siteIdFromPath)) {
          siteId = siteIdFromPath;
        } else if (!siteId || !siteExists) {
          siteId = siteIds.includes(this.siteId)
            ? this.siteId
            : response.data[0].projectId;
        }

        const hasRecordings = this.list.some((site) => site.recorded);
        if (!hasRecordings) {
          localStorage.setItem(GLOBAL_HAS_NO_RECORDINGS, 'true');
        } else {
          localStorage.removeItem(GLOBAL_HAS_NO_RECORDINGS);
        }
        if (siteId) {
          this.setSiteId(siteId);
        }
      });
    } catch (error) {
      console.error('Failed to fetch site list:', error);
    } finally {
      this.setSitesLoading(false);
    }
  };

  save = async (projectData: Partial<Project>) => {
    this.setLoading(true);
    try {
      const response = await projectsService.saveProject(projectData);

      const newSite = new Project(response.data);
      const index = this.list.findIndex((site) => site.id === newSite.id);
      if (index !== -1) {
        this.list[index] = newSite;
      } else {
        this.list.push(newSite);
      }
      // this.setSiteId(newSite.id!);
      // this.active = newSite;
      return newSite;
    } catch (error: any) {
      throw error || 'An error occurred while saving the project.';
    } finally {
      this.setLoading(false);
    }
  };

  updateProjectRecordingStatus = (siteId: string, status: boolean) => {
    const site = this.list.find((site) => site.id === siteId);
    if (site) {
      site.recorded = status;
      const hasRecordings = this.list.some((site) => site.recorded);
      if (!hasRecordings) {
        localStorage.setItem(GLOBAL_HAS_NO_RECORDINGS, 'true');
      } else {
        localStorage.removeItem(GLOBAL_HAS_NO_RECORDINGS);
      }
    }
  };

  removeProject = async (projectId: string) => {
    this.setLoading(true);
    try {
      await projectsService.removeProject(projectId);
      runInAction(() => {
        this.list = this.list.filter((site) => site.id !== projectId);
        this.setConfigProject();
        if (this.active?.id === projectId) {
          this.setSiteId(this.list[0].id!);
        }
      });
    } catch (error) {
      throw error || new Error('An error occurred while deleting the project.');
    } finally {
      this.setLoading(false);
    }
  };

  updateProject = async (projectId: string, projectData: Partial<Project>) => {
    this.setLoading(true);
    try {
      const response = await projectsService.updateProject(projectId, {
        name: projectData.name,
        platform: projectData.platform,
      });
      runInAction(() => {
        const updatedSite = new Project(response.data);
        const index = this.list.findIndex((site) => site.id === updatedSite.id);
        if (index !== -1) {
          this.list[index] = updatedSite;
        }
      });
    } catch (error) {
      throw error || new Error('An error occurred while updating the project.');
    } finally {
      this.setLoading(false);
    }
  };

  setConfigProject = (pid?: number) => {
    if (!pid) {
      const firstProject = this.list[0];
      this.config.pid = firstProject?.projectId ?? undefined;
      this.config.project = firstProject ?? null;
      return;
    }

    const project = this.list.find((site) => site.projectId === pid);
    if (!project) {
      // set the first project as active
      this.setConfigProject();
    } else {
      this.config.pid = project?.projectId ?? undefined;
      this.config.project = project ?? null;
    }
  };

  setConfigTab = (tab: string | null) => {
    this.config.tab = tab ?? 'installation';
  };
}
