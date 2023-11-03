import { action, computed, makeObservable, observable } from 'mobx';
import { configService } from 'App/services';
import { GETTING_STARTED } from 'App/constants/storageKeys';

const stepsMap: any = {
  'Install OpenReplay': {
    title: '🛠️ Install OpenReplay',
    status: 'pending',
    description: 'Install via script or NPM package',
    docsLink: 'https://docs.openreplay.com/en/sdk/constructor/',
    url: 'installing',
  },
  'Identify Users': {
    title: '🕵️ Identify Users',
    status: 'pending',
    description: 'Filter sessions by user ID.',
    docsLink: 'https://docs.openreplay.com/en/v1.10.0/installation/identify-user/',
    url: 'identify-users',
  },
  'Invite Team Members': {
    title: '🧑‍💻 Invite Team Members',
    status: 'pending',
    description: 'Invite team members, collaborate and start improving your app now.',
    docsLink: 'https://docs.openreplay.com/en/tutorials/adding-users/',
    url: 'team',
  },
  Integrations: {
    title: '🔌 Integrations',
    status: 'pending',
    description: 'Sync your backend errors with sessions replays.',
    docsLink: 'https://docs.openreplay.com/en/integrations/',
    url: 'integrations',
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
      // status: observable,
      fetchData: action,
      numCompleted: computed,
      numPending: computed,
      percentageCompleted: computed,
      label: computed,
      numPendingSteps: computed,
    });

    // steps = {'tenatId': {steps: [], status: 'in-progress'}
    const gettingStartedSteps = localStorage.getItem(GETTING_STARTED);
    if (gettingStartedSteps) {
      const steps = JSON.parse(gettingStartedSteps);
      this.steps = steps.steps;
      this.status = steps.status;
    }
  }

  fetchData() {
    if (this.status === 'completed') {
      return;
    }
    configService.fetchGettingStarted().then((data) => {
      this.steps = data.map((item: any) => {
        const step = stepsMap[item.task];

        return {
          ...step,
          status: item.done ? 'completed' : 'pending',
        };
      });
      this.status = this.calculateStatus();
      this.updateLocalStorage();
    });
  }

  updateLocalStorage() {
    localStorage.setItem(
      GETTING_STARTED,
      JSON.stringify({
        steps: this.steps.map((item: any) => ({
          title: item.title,
          status: item.status,
        })),
        status: this.status,
      })
    );
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
    this.updateLocalStorage();
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
