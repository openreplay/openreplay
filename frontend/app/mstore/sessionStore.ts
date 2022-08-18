import { makeAutoObservable, observable, action } from 'mobx';
import { sessionService } from 'App/services';
import { filterMap } from 'Duck/search';
import Session from './types/session';
import Record, { LAST_7_DAYS } from 'Types/app/period';

class UserFilter {
    endDate: number = new Date().getTime();
    startDate: number = new Date().getTime() - 24 * 60 * 60 * 1000;
    rangeName: string = LAST_7_DAYS;
    filters: any = [];
    page: number = 1;
    limit: number = 10;
    period: any = Record({ rangeName: LAST_7_DAYS });

    constructor() {
        makeAutoObservable(this, {
            page: observable,
            update: action,
        });
    }

    update(key: string, value: any) {
        this[key] = value;

        if (key === 'period') {
            this.startDate = this.period.start;
            this.endDate = this.period.end;
        }
    }

    setFilters(filters: any[]) {
        this.filters = filters;
    }

    setPage(page: number) {
        this.page = page;
    }

    toJson() {
        return {
            endDate: this.period.end,
            startDate: this.period.start,
            filters: this.filters.map(filterMap),
            page: this.page,
            limit: this.limit,
        };
    }
}

export default class SessionStore {
    userFilter: UserFilter = new UserFilter();

    constructor() {
        makeAutoObservable(this, {
            userFilter: observable,
        });
    }

    resetUserFilter() {
        this.userFilter = new UserFilter();
    }

    getSessions(filter: any): Promise<any> {
        return new Promise((resolve, reject) => {
            sessionService
                .getSessions(filter.toJson())
                .then((response: any) => {
                    resolve({
                        sessions: response.sessions.map((session: any) => new Session().fromJson(session)),
                        total: response.total,
                    });
                })
                .catch((error: any) => {
                    reject(error);
                });
        });
    }
}
