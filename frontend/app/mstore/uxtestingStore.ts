import { uxtestingService } from 'App/services';
import { UxTest, UxTask, UxTSearchFilters, UxTListEntry } from "App/services/UxtestingService";
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

export default class UxtestingStore {
  client = uxtestingService;
  tests: UxTListEntry[] = [];
  instance: UxTestInst | null = null;
  page: number = 1;
  total: number = 0;
  pageSize: number = 10;
  searchQuery: string = '';
  testStats: Stats | null = null;
  testSessions: any[] = [];
  tastStats: TaskStats[] = [];
  isLoading: boolean = false;

  constructor() {
    makeAutoObservable(this);
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

  initNewTest(title: string, description: string) {
    const initialData = {
      title: title,
      projectId: 0,
      created_by: 0,
      starting_path: '',
      require_mic: false,
      require_camera: false,
      description: description,
      guidelines: '',
      conclusion_message: '',
      visibility: true,
      tasks: [],
    };
   this.setInstance(new UxTestInst(initialData))
  }

  setInstance(instance: UxTestInst) {
    this.instance = instance;
  }

  getList = async () => {
    this.setLoading(true);
    try {
      const filters: Partial<UxTSearchFilters> = {
        query: this.searchQuery,
        page: this.page,
        limit: this.pageSize,
        sort_by: 'created_at',
        sort_order: 'desc',
      };
      const { list, total } = await this.client.fetchTestsList(filters);
      this.setList(list);
      this.setTotal(total);
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false)
    }
  };

  createNewTest = async () => {
    this.setLoading(true);
    try {
      await this.client.createTest(this.instance!);
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false)
    }
  }

  getTest = async (testId: string) => {
    this.setLoading(true);
    try {
      const testPr = this.client.fetchTest(testId);
      const statsPr = this.client.fetchTestStats(testId)
      const taskStatsPr = this.client.fetchTestTaskStats(testId)
      const sessionsPr = this.client.fetchTestSessions(testId, 1, 10)
      Promise.allSettled([testPr, statsPr, taskStatsPr, sessionsPr]).then((results) => {
        if (results[0].status === 'fulfilled') {
          const test = results[0].value;
          if (test) {
            this.setInstance(new UxTestInst(test))
          }
        }
        if (results[1].status === 'fulfilled') {
          const stats = results[1].value;
          if (stats) {
            this.testStats = stats
          }
        }
        if (results[2].status === 'fulfilled') {
          const taskStats = results[2].value;
          console.log(taskStats)
          if (taskStats) {
            this.tastStats = taskStats
          }
        }
        if (results[3].status === 'fulfilled') {
          const { sessions } = results[3].value;
          if (sessions) {
            this.testSessions = sessions.map((s: any) => new Session(({ ...s, metadata: {} })));
          }
        }
      })
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false)
    }
  }
}

class UxTestInst {
  title: string = '';
  starting_path: string = '';
  require_mic: boolean = false;
  require_camera: boolean = false;
  description: string = '';
  guidelines: string = '';
  conclusion_message: string = '';
  visibility: boolean = false;
  tasks: UxTask[] = [];
  status?: string
  id?: number

  constructor(initialData: Partial<UxTestInst> = {}) {
    makeAutoObservable(this);
    Object.assign(this, initialData);
  }

  setProperty<T extends keyof UxTestInst>(key: T, value: UxTestInst[T]) {
    (this[key] as UxTestInst[T]) = value;
  }
}
