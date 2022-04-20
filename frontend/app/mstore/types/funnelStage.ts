export default class FunnelStage {
    dropDueToIssues: number = 0;
    dropPct: number = 0;
    operator: string = "";
    sessionsCount: number = 0;
    usersCount: number = 0;
    value: string[] = [];

    fromJSON(json: any) {
        this.dropDueToIssues = json.dropDueToIssues;
        this.dropPct = json.dropPct;
        this.operator = json.operator;
        this.sessionsCount = json.sessionsCount;
        this.usersCount = json.usersCount;
        this.value = json.value;
        return this;
    }
}