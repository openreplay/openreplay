import { action, computed, makeObservable, observable } from 'mobx';
import { configService } from 'App/services';

const stepsMap: any = {
  'Install OpenReplay': {
    title: '🛠️ Install OpenReplay',
    status: 'pending',
    description: 'Install via script or NPM package',
    docsLink: 'https://docs.openreplay.com/en/sdk/constructor/',
  },
  'Identify Users': {
    title: '🕵️ Identify Users',
    status: 'pending',
    description: 'Filter sessions by user ID.',
    docsLink: 'https://docs.openreplay.com/en/v1.10.0/installation/identify-user/',
  },
  'Invite Team Members': {
    title: '🧑‍💻 Invite Team Members',
    status: 'pending',
    description: 'Invite team members, collaborate and start improving your app now.',
    docsLink: 'https://docs.openreplay.com/en/tutorials/adding-users/',
  },
  Integrations: {
    title: '🔌 Integrations',
    status: 'pending',
    description: 'Sync your backend errors with sessions replays.',
    docsLink: 'https://docs.openreplay.com/en/integrations/',
  },
};

export interface Step {
  title: string;
  status: 'pending' | 'ignored' | 'completed';
  description: string;
  url: string;
  docsLink: string;
}

export class GettingStarted {
  steps: Step[] = [];
  status: 'in-progress' | 'completed';

  constructor() {
    makeObservable(this, {
      steps: observable,
      completeStep: action,
      ignoreStep: action,
      reset: action,
      completeAllSteps: action,
      setStatus: action,
      status: observable,
      fetchData: action,
      numCompleted: computed,
      numPending: computed,
      percentageCompleted: computed,
      label: computed,
      numPendingSteps: computed,
    });
  }

  fetchData() {
    configService.fetchGettingStarted().then((data) => {
      this.steps = data.map((item: any) => {
        const step = stepsMap[item.task];

        return {
          ...step,
          status: item.done ? 'completed' : 'pending',
          url: item.url,
        };
      });
      this.status = this.calculateStatus();
    });
  }

  calculateStatus() {
    const numCompleted = this.numCompleted;
    const numPending = this.numPending;
    const numIgnored = this.steps.length - numCompleted - numPending;

    if (numIgnored > 0) {
      return 'in-progress';
    } else {
      return numPending > 0 ? 'in-progress' : 'completed';
    }
  }

  completeStep(step: Step) {
    step.status = 'completed';
    this.status = this.calculateStatus();
  }

  ignoreStep(step: Step) {
    step.status = 'ignored';
    this.status = this.calculateStatus();
  }

  reset() {
    this.steps.forEach((step) => (step.status = 'pending'));
    this.status = 'in-progress';
  }

  completeAllSteps() {
    this.steps.forEach((step) => (step.status = 'completed'));
    this.status = 'completed';
  }

  setStatus(status: 'in-progress' | 'completed') {
    this.steps.forEach((step) => (step.status = status === 'completed' ? 'completed' : 'pending'));
    this.status = status;
  }

  get numCompleted() {
    return this.steps.filter((step) => step.status === 'completed').length;
  }

  get numPending() {
    return this.steps.filter((step) => step.status === 'pending').length;
  }

  get percentageCompleted() {
    const completed = this.numCompleted;
    const total = this.steps.length;
    return Math.round((completed / total) * 100);
  }

  get label() {
    const completed = this.numCompleted;
    const total = this.steps.length;
    return `${completed}/${total}`;
  }

  get numPendingSteps() {
    return this.steps.filter((step) => step.status === 'pending').length;
  }
}
