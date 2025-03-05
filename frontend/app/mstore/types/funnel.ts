import FunnelStage from './funnelStage';

export default class Funnel {
  affectedUsers: number = 0;

  totalConversions: number = 0;

  conversionImpact: number = 0;

  lostConversions: number = 0;

  lostConversionsPercentage: number = 0;

  totalConversionsPercentage: number = 0;

  isPublic: boolean = false;

  stages: FunnelStage[] = [];

  raw: any = null;

  totalDropDueToIssues: number = 0;

  constructor() {}

  fromJSON(json: any) {
    if (!this.raw) {
      this.raw = json;
    }
    this.totalDropDueToIssues = json.totalDropDueToIssues;

    if (json.stages?.length >= 1) {
      const firstStage = json.stages[0];
      this.stages = json.stages
        ? json.stages.map((stage: any, index: number) =>
            new FunnelStage().fromJSON(
              stage,
              firstStage.count,
              index > 0 ? json.stages[index - 1].count : stage.count,
            ),
          )
        : [];
      const filteredStages = this.stages.filter((stage: any) => stage.isActive);
      const lastStage = filteredStages[filteredStages.length - 1];

      this.lostConversions = firstStage.count - lastStage.count || 0;
      this.lostConversionsPercentage =
        Math.round((this.lostConversions / firstStage.count) * 100) || 0;

      this.totalConversions = lastStage.count || 0;
      this.totalConversionsPercentage =
        Math.round((this.totalConversions / firstStage.count) * 100) || 0;

      this.conversionImpact = this.lostConversions
        ? Math.round((this.lostConversions / firstStage.count) * 100)
        : 0;
      this.affectedUsers = firstStage.usersCount
        ? firstStage.usersCount - lastStage.usersCount
        : 0;
    }

    return this;
  }
}
