import { uxtestingService } from 'App/services';
import { UxTask, UxTSearchFilters, UxTListEntry, UxTest } from 'App/services/UxtestingService';
import { makeAutoObservable } from 'mobx';
import Session from 'Types/session';

interface Stats {
  completed_all_tasks: number;
  tasks_completed: number;
  tasks_skipped: number;
  tests_attempts: number;
  tests_skipped: number;
}

interface TaskStats {
  taskId: number;
  title: string;
  completed: number;
  avgCompletionTime: number;
  skipped: number;
}

interface Response {
  user_id: string | null;
  status: string;
  comment: string;
  timestamp: number;
  duration: number;
}

export default class UxtestingStore {
  client = uxtestingService;
  tests: UxTListEntry[] = [];
  instance: UxTestInst | null = null;
  page: number = 1;
  total: number = 0;
  pageSize: number = 10;
  searchQuery: string = '';
  testStats: Stats | null = null;
  testSessions: Session[] = [];
  taskStats: TaskStats[] = [];
  isLoading: boolean = false;
  responses: Record<number, { list: Response[]; total: number }> = {};
  hideDevtools: boolean = localStorage.getItem('or_devtools_utx_toggle') === '1';

  constructor() {
    makeAutoObservable(this);
  }

  setHideDevtools(hide: boolean) {
    this.hideDevtools = hide;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setList(tests: UxTListEntry[]) {
    this.tests = tests;
  }

  setTotal(total: number) {
    this.total = total;
  }

  setPage(page: number) {
    this.page = page;
  }

  updateTestStatus = async (status: string) => {
    if (!this.instance) return;
    this.setLoading(true);
    try {
      const test: UxTest = {
        ...this.instance!,
        status,
      };
      console.log(test);
      this.updateInstStatus(status);
      await this.client.updateTest(this.instance.testId!, test);
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  updateTest = async (test: UxTestInst) => {
    if (!this.instance) return;
    this.setLoading(true);
    try {
      await this.client.updateTest(this.instance.testId!, test);
      return test.testId
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  }

  updateInstStatus = (status: string) => {
    if (!this.instance) return;
    this.instance.setProperty('status', status);
  };

  fetchResponses = async (testId: number, taskId: number, page: number) => {
    this.setLoading(true);
    try {
      this.responses[taskId] = await this.client.fetchTaskResponses(testId, taskId, page, 10);
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  initNewTest(title: string, description: string) {
    const initialData = {
      title: title,
      startingPath: '',
      requireMic: false,
      requireCamera: false,
      description: description,
      guidelines: '',
      conclusionMessage: '',
      visibility: true,
      tasks: [],
    };
    this.setInstance(new UxTestInst(initialData));
  }

  deleteTest = async (testId: number) => {
    return this.client.deleteTest(testId);
  };

  setInstance(instance: UxTestInst) {
    this.instance = instance;
  }

  setQuery(query: string) {
    this.searchQuery = query;
  }

  getList = async () => {
    this.setLoading(true);
    try {
      const filters: Partial<UxTSearchFilters> = {
        query: this.searchQuery,
        page: this.page,
        limit: this.pageSize,
        sortBy: 'created_at',
        sortOrder: 'desc',
      };
      const { list, total } = await this.client.fetchTestsList(filters);
      this.setList(list);
      this.setTotal(total);
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  createNewTest = async (isPreview?: boolean) => {
    this.setLoading(true);
    try {
      // @ts-ignore
      return await this.client.createTest({ ...this.instance, status: isPreview ? 'preview' : 'in-progress' });
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  getTestData = async (testId: string) => {
    this.setLoading(true);
    try {
      const test = await this.client.fetchTest(testId);
      this.setInstance(new UxTestInst(test));
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  getTest = async (testId: string) => {
    this.setLoading(true);
    try {
      const testPr = this.client.fetchTest(testId);
      const statsPr = this.client.fetchTestStats(testId);
      const taskStatsPr = this.client.fetchTestTaskStats(testId);
      const sessionsPr = this.client.fetchTestSessions(testId, this.page, 10);
      Promise.allSettled([testPr, statsPr, taskStatsPr, sessionsPr]).then((results) => {
        if (results[0].status === 'fulfilled') {
          const test = results[0].value;
          if (test) {
            this.setInstance(new UxTestInst(test));
          }
        }
        if (results[1].status === 'fulfilled') {
          const stats = results[1].value;
          if (stats) {
            this.testStats = stats;
          }
        }
        if (results[2].status === 'fulfilled') {
          const taskStats = results[2].value;
          if (taskStats) {
            this.taskStats = taskStats.sort((a: any, b: any) => a.taskId - b.taskId);
          }
        }
        if (results[3].status === 'fulfilled') {
          const { total, page, sessions } = results[3].value;
          if (sessions) {
            this.testSessions = sessions.map((s: any) => new Session({ ...s, metadata: {} }));
          }
        }
      });
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };
}

class UxTestInst {
  title: string = '';
  requireMic: boolean = false;
  requireCamera: boolean = false;
  description: string = '';
  guidelines: string = '';
  visibility: boolean = false;
  tasks: UxTask[] = [];
  status: string;
  startingPath: string;
  testId?: number;
  responsesCount?: number;
  liveCount?: number;
  conclusionMessage: string;

  constructor(initialData: Partial<UxTestInst> = {}) {
    makeAutoObservable(this);
    Object.assign(this, initialData);
  }

  setProperty<T extends keyof UxTestInst>(key: T, value: UxTestInst[T]) {
    (this[key] as UxTestInst[T]) = value;
  }
}
