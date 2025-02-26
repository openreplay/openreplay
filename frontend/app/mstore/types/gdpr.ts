import { makeAutoObservable } from 'mobx';

export default class GDPR {
  id = undefined;

  maskEmails = false;

  maskNumbers = false;

  defaultInputMode = 'plain';

  sampleRate = 0;

  constructor(data = {}) {
    Object.assign(this, data);
    makeAutoObservable(this);
  }

  edit = (data: Partial<GDPR>) => {
    Object.keys(data).forEach((key) => {
      this[key] = data[key];
    });
  };

  toData = () => ({
    id: this.id,
    maskEmails: this.maskEmails,
    maskNumbers: this.maskNumbers,
    defaultInputMode: this.defaultInputMode,
    sampleRate: this.sampleRate,
  });
}
