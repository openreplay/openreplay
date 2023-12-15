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

const defaultGuidelines = `Introduction:
Thank you for participating in this important stage of our [Website/App] development. Your insights will help us enhance the [Desktop/Mobile] experience for all users.

Before You Begin:
• Device: Ensure you're using a [Desktop/Mobile] for this test.

• Environment: Choose a quiet location where you can focus without interruptions.

Test Guidelines:
1. Task Flow: You will perform a series of tasks as you normally would when using a [Website/App].

2. Think Aloud: Please verbalize your thoughts. If something is confusing, interesting, or pleasing, let us know.

3. No Right or Wrong: There are no correct answers here, just your honest experience.

4. Pace Yourself: Take your time, there's no rush to complete the tasks quickly.

5. Technical Issues: If you encounter any issues, please describe what you were attempting to do when the issue occurred.
`;
const defaultConclusion =
  'Thank you for participating in our usability test. Your feedback is invaluable to us and will contribute significantly to improving our product.';

export default class UxtestingStore {
  client = uxtestingService;
  tests: UxTListEntry[] = [];
  instance: UxTestInst | null = null;
  instanceCreationSiteId = '';
  page: number = 1;
  total: number = 0;
  pageSize: number = 10;
  searchQuery: string = '';
  testStats: Stats | null = null;
  testSessions: { list: Session[]; total: number; page: number } = { list: [], total: 0, page: 1 };
  testAssistSessions: { list: Session[]; total: number; page: number } = {
    list: [],
    total: 0,
    page: 1,
  };
  taskStats: TaskStats[] = [];
  isLoading: boolean = false;
  responses: Record<number, { list: Response[]; total: number }> = {};
  hideDevtools: boolean = localStorage.getItem('or_devtools_uxt_toggle') === '1';

  constructor() {
    makeAutoObservable(this);
  }

  isUxt() {
    const queryParams = new URLSearchParams(document.location.search);
    return queryParams.has('uxt');
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

  updateTest = async (test: UxTestInst, isPreview?: boolean) => {
    if (!this.instance) return;
    this.setLoading(true);
    try {
      if (!isPreview) {
        this.instance.setProperty('status', 'in-progress');
      }
      await this.client.updateTest(this.instance.testId!, test);
      return test.testId;
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  updateInstStatus = (status: string) => {
    if (!this.instance) return;
    this.instance.setProperty('status', status);
  };

  fetchResponses = async (testId: number, taskId: number, page: number, query?: string) => {
    try {
      this.responses[taskId] = await this.client.fetchTaskResponses(testId, taskId, page, 10, query);
    } catch (e) {
      console.error(e);
    }
  };

  initNewTest(title: string, description: string, siteId: string) {
    this.instanceCreationSiteId = siteId;
    const initialData = {
      title: title,
      startingPath: 'https://',
      requireMic: false,
      requireCamera: false,
      description: description,
      guidelines: defaultGuidelines,
      conclusionMessage: defaultConclusion,
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
      return await this.client.createTest({
        ...this.instance,
        status: isPreview ? 'preview' : 'in-progress',
      });
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
      return this.instance;
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  setTestStats(stats: Stats) {
    this.testStats = stats;
  }

  setTaskStats(stats: TaskStats[]) {
    this.taskStats = stats;
  }

  setTestSessions(sessions: { list: Session[]; total: number; page: number }) {
    this.testSessions = sessions;
  }

  setSessionsPage(page: number) {
    this.testSessions.page = page;
    this.client
      .fetchTestSessions(this.instance!.testId!.toString(), this.testSessions.page, 10)
      .then((result) => {
        this.setTestSessions(result);
      });
  }

  setAssistSessions = (data: { sessions: Session[]; total: number; page: number }) => {
    this.testAssistSessions = {
      list: data.sessions.map((s: any) => new Session({ ...s, metadata: {} })),
      total: data.total,
      page: data.page,
    };
  };

  getAssistSessions = async (testId: string, page: number, userId?: string) => {
    try {
      const sessions = await this.client.fetchTestSessions(testId, page, 10, true, userId);
      this.setAssistSessions(sessions);
    } catch (e) {
      console.error(e);
    }
  };

  getTest = async (testId: string) => {
    this.setLoading(true);
    try {
      const testPr = this.client.fetchTest(testId);
      const statsPr = this.client.fetchTestStats(testId);
      const taskStatsPr = this.client.fetchTestTaskStats(testId);
      const sessionsPr = this.client.fetchTestSessions(testId, this.testSessions.page, 10);
      return Promise.allSettled([testPr, statsPr, taskStatsPr, sessionsPr]).then((results) => {
        if (results[0].status === 'fulfilled') {
          const test = results[0].value;
          if (test) {
            this.setInstance(new UxTestInst(test));
          }
        } else {
          throw 'Test not found'
        }
        if (results[1].status === 'fulfilled') {
          const stats = results[1].value;
          if (stats) {
            this.setTestStats(stats);
          }
        }
        if (results[2].status === 'fulfilled') {
          const taskStats = results[2].value;
          if (taskStats) {
            this.setTaskStats(taskStats.sort((a: any, b: any) => a.taskId - b.taskId));
          }
        }
        if (results[3].status === 'fulfilled') {
          const { total, page, sessions } = results[3].value;
          if (sessions) {
            const result = {
              list: sessions.map((s: any) => new Session({ ...s, metadata: {} })),
              total,
              page,
            };
            this.setTestSessions(result);
          }
        }
      }).then(() => true)
    } catch (e) {
      console.error(e);
      return false;
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
