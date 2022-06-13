import { makeAutoObservable, observable, action } from "mobx"
import { filterLabelMap } from 'Types/filter/newFilter';
export default class FunnelStage {
    dropDueToIssues: number = 0;
    dropPct: number = 0;
    operator: string = "";
    sessionsCount: number = 0;
    usersCount: number = 0;
    type: string = '';
    value: string[] = [];
    label: string = '';
    isActive: boolean = false;

    constructor() {
        makeAutoObservable(this, {
            isActive: observable,
            updateKey: action,
        })
    }

    fromJSON(json: any) {
        this.dropDueToIssues = json.dropDueToIssues;
        this.dropPct = json.dropPct;
        this.operator = json.operator;
        this.sessionsCount = json.sessionsCount;
        this.usersCount = json.usersCount;
        this.value = json.value;
        this.type = json.type;
        this.label = filterLabelMap[json.type] || json.type;
        return this;
    }

    updateKey(key: any, value: any) {
        this[key] = value
    }
}