import { DateTime } from 'luxon';
import { unserscoreToSpaceAndCapitalize } from 'App/utils';

export default class Audit {
    id: string = '';
    username: string = '';
    email: string = '';
    action: string = '';
    createdAt: any = null;
    endPoint: string = '';
    parameters: any = {};
    method: string = '';
    status: string = '';
    payload: any = {}
    
    constructor() {
    }

    static fromJson(json: any): Audit {
        const audit = new Audit();
        audit.id = json.rn;
        audit.username = json.username;
        audit.action = unserscoreToSpaceAndCapitalize(json.action);
        audit.createdAt = json.createdAt && DateTime.fromMillis(json.createdAt || 0);
        audit.endPoint = json.endpoint;
        audit.parameters = json.parameters;
        audit.method = json.method;
        audit.status = json.status
        audit.email = json.email
        audit.payload = typeof json.payload === 'string' ? JSON.parse(json.payload) : json.payload
        return audit;
    }

    toJson(): any {
        return {
            id: this.id,
            username: this.username
        };
    }
}