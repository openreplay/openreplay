import { resentOrDate, shortDurationFromMs } from 'App/date';
import { makeAutoObservable } from 'mobx';

export class Spot {
  thumbnail: string;

  title: string;

  createdAt: string;

  user: string;

  duration: string;

  spotId: string;

  mobURL?: string;

  videoURL?: string;

  streamFile?: string;

  comments?: { user: string; text: string; createdAt: string }[] = [];

  /** public access key to add to url */
  key?: { key: string; expirationDate: string } | null = null;

  constructor(data: Record<string, any>) {
    makeAutoObservable(this);
    this.setAdditionalData(data);
    this.comments = data.comments ?? [];
    this.thumbnail = data.previewURL;
    this.title = data.name;
    this.createdAt = resentOrDate(new Date(data.createdAt).getTime(), true);
    this.user = data.userEmail;
    this.duration = shortDurationFromMs(data.duration);
    this.spotId = data.id;
  }

  setAdditionalData(data: Record<string, any>) {
    Object.assign(this, data);
  }
}
