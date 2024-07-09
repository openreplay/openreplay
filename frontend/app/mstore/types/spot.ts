import { resentOrDate, shortDurationFromMs } from "App/date";

export class Spot {
  thumbnail: string;
  title: string;
  createdAt: string;
  user: string;
  duration: string;
  spotId: number;

  constructor(data: Record<string, any>) {
  this.thumbnail = data.previewURL
    this.title = data.name;
    this.createdAt = resentOrDate(new Date(data.createdAt).getTime());
    this.user = data.userID;
    this.duration = shortDurationFromMs(data.duration);
    this.spotId = data.id;
  }
}
