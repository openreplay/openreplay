import { makeAutoObservable, observable, action } from "mobx"
import { filterLabelMap } from 'Types/filter/newFilter';
export default class FunnelStage {
    dropDueToIssues: number = 0;
    dropDueToIssuesPercentage: number = 0;
    dropPct: number = 0;
    operator: string = "";
    sessionsCount: number = 0;
    usersCount: number = 0;
    type: string = '';
    value: string[] = [];
    label: string = '';
    isActive: boolean = true;
    completedPercentage: number = 0;
    droppedCount: number = 0;
    droppedPercentage: number = 0;

    constructor() {
        makeAutoObservable(this, {
            isActive: observable,
            updateKey: action,
        })
    }

    fromJSON(json: any, total: number = 0, previousSessionCount: number = 0) {
        this.dropDueToIssues = json.dropDueToIssues;
        this.dropPct = json.dropPct;
        this.operator = json.operator;
        this.sessionsCount = json.sessionsCount;
        this.usersCount = json.usersCount;
        this.value = json.value;
        this.type = json.type;
        this.label = filterLabelMap[json.type] || json.type;
        this.completedPercentage = total ? Math.round((this.sessionsCount / total) * 100) : 0;
        this.dropDueToIssuesPercentage = total ? Math.round((this.dropDueToIssues / total) * 100) : 0;
        this.droppedCount = previousSessionCount - this.sessionsCount;
        this.droppedPercentage = this.droppedCount ? Math.round((this.droppedCount / total) * 100) : 0;
        return this;
    }

    updateKey(key: any, value: any) {
        this[key] = value
    }
}