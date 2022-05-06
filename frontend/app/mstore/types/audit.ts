import { DateTime } from 'luxon';
import { unserscoreToSpaceAndCapitalize } from 'App/utils';

export default class Audit {
    id: string = '';
    userName: string = '';
    action: string = '';
    createdAt: any = null;
    endPoint: string = '';
    parameters: any = {};
    method: string = '';
    status: string = '';
    
    constructor() {
    }

    static fromJson(json: any): Audit {
        const audit = new Audit();
        audit.id = json.rn;
        audit.userName = json.userName;
        audit.action = unserscoreToSpaceAndCapitalize(json.action);
        audit.createdAt = json.createdAt && DateTime.fromMillis(json.createdAt || 0);
        audit.endPoint = json.endPoint;
        audit.parameters = json.parameters;
        audit.method = json.method;
        audit.status = json.status;
        return audit;
    }

    toJson(): any {
        return {
            id: this.id,
            userName: this.userName
        };
    }
}