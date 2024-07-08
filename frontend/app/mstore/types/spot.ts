import { checkForRecent, shortDurationFromMs } from 'App/date';

export class Spot {
  thumbnail: string;
  title: string;
  createdAt: string;
  user: string;
  duration: string;
  spotId: string;

  constructor(data: Record<string, any>) {
    this.thumbnail = data.thumbnail;
    this.title = data.title;
    this.createdAt = checkForRecent(data.createdAt, 'LLL dd, yyyy, hh:mm a', true);
    this.user = data.user;
    this.duration = shortDurationFromMs(data.duration);
    this.spotId = data.spotId;
  }
}
