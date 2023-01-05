interface IUserActivity {
  avgVisitedPages: number;
  avgVisitedPagesProgress: number;
  avgDuration: number;
  avgDurationProgress: number;
}

export default class UserActivity {
  avgVisitedPages: IUserActivity["avgVisitedPages"]
  avgVisitedPagesProgress: IUserActivity["avgDurationProgress"]
  avgDuration: IUserActivity["avgDuration"]
  avgDurationProgress: IUserActivity["avgDurationProgress"]

  constructor(activity: IUserActivity) {
    Object.assign(this, activity)
  }
}