import { validateURL } from 'App/validate';
import { makeAutoObservable } from 'mobx';

export class MessengerConfig {
  endpoint: string = '';

  name: string = '';

  webhookId: string = '';

  constructor(config: any) {
    Object.assign(this, {
      endpoint: config.endpoint,
      name: config.name,
      webhookId: config.webhookId,
    });
    makeAutoObservable(this);
  }

  edit = (data: any): void => {
    Object.keys(data).forEach((key) => {
      // @ts-ignore
      this[key] = data[key];
    });
  };

  validate(): boolean {
    return (
      this.endpoint !== '' && this.name != '' && validateURL(this.endpoint)
    );
  }

  exists(): boolean {
    return !!this.webhookId;
  }

  toData(): { endpoint: string; url: string; name: string; webhookId: string } {
    return {
      endpoint: this.endpoint,
      url: this.endpoint,
      name: this.name,
      webhookId: this.webhookId,
    };
  }
}
