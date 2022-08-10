import FunnelStage from "./funnelStage";

export default class FunnelInsights {
    stages: FunnelStage[] = [];
    totalDropDueToIssues: number = 0;

    fromJSON(json: any) {
        this.stages = json.stages.map(stage => new FunnelStage().fromJSON(stage));
        this.totalDropDueToIssues = json.totalDropDueToIssues;
        return this;
    }
}