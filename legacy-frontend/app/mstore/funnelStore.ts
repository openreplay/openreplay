import { makeAutoObservable, action } from "mobx"
import { funnelService } from "App/services"
import Funnel, { IFunnel } from "./types/funnel";
import Session from './types/session';
import FunnelIssue from './types/funnelIssue';
import Period, { LAST_7_DAYS } from 'Types/app/period';

export default class FunnelStore {
    isLoading: boolean = false
    isSaving: boolean = false
    list: IFunnel[] = []
    instance: IFunnel | null = null
    period: Period = Period({ rangeName: LAST_7_DAYS })
    search: string = ''

    page: number = 1
    pageSize: number = 10

    issues: any[] = []
    isLoadingIssues: boolean = false
    issuesFilter: any = []

    issueInstance: FunnelIssue | null = null
    issuesSort = {
        sort: "afectedUsers",
        order: 'desc',
    }
    
    constructor() {
        makeAutoObservable(this, {
            updateKey: action,
            fetchFunnels: action,
            fetchFunnel: action,
            saveFunnel: action,
            deleteFunnel: action
        })
        this.issues = sampleIssues.map(i => new FunnelIssue().fromJSON(i));
    }

    updateKey(key: string, value: any) {
        this[key] = value
    }

    fetchFunnels(): Promise<any> {
        this.isLoading = true
        return new Promise((resolve, reject) => {
            funnelService.all()
                .then(response => {
                    this.list = response
                    resolve(response)
                }).catch(error => {
                    reject(error)
                }).finally(() => {
                    this.isLoading = false
                }
            )
        })
    }

    fetchFunnel(funnelId: string): Promise<any> {
        this.isLoading = true
        return new Promise((resolve, reject) => {
            funnelService.one(funnelId)
                .then(response => {
                    const _funnel = new Funnel().fromJSON(response)
                    this.instance = _funnel
                    resolve(_funnel)
                }).catch(error => {
                    reject(error)
                }).finally(() => {
                    this.isLoading = false
                }
            )
        })
    }

    saveFunnel(funnel: IFunnel): Promise<any> {
        this.isSaving = true
        const wasCreating = !funnel.funnelId
        return new Promise((resolve, reject) => {
            funnelService.save(funnel)
                .then(response => {
                    const _funnel = new Funnel().fromJSON(response)
                    if (wasCreating) {
                        this.list.push(_funnel)
                    }
                    resolve(_funnel)
                }).catch(error => {
                    reject(error)
                }).finally(() => {
                    this.isSaving = false
                }
            )
        })
    }

    deleteFunnel(funnelId: string): Promise<any> {
        this.isSaving = true
        return new Promise((resolve, reject) => {
            funnelService.delete(funnelId)
                .then(response => {
                    this.list = this.list.filter(funnel => funnel.funnelId !== funnelId)
                    resolve(funnelId)
                }).catch(error => {
                    reject(error)
                }).finally(() => {
                    this.isSaving = false
                }
            )
        })
    }

    fetchIssues(funnelId?: string): Promise<any> {
        this.isLoadingIssues = true
        return new Promise((resolve, reject) => {
            funnelService.fetchIssues(funnelId, this.period.toTimestamps())
                .then(response => {
                    this.issues = response.map(i => new FunnelIssue().fromJSON(i))
                    resolve(this.issues)
                }).catch(error => {
                    reject(error)
                }
            ).finally(() => {
                this.isLoadingIssues = false
            })
        })
    }

    fetchIssue(funnelId: string, issueId: string): Promise<any> {
        this.isLoadingIssues = true
        return new Promise((resolve, reject) => {
            // funnelService.fetchIssue(funnelId, issueId)
            funnelService.fetchIssue('143', '91515f9118ed803291f87133e2cb49a16ea')
                .then(response => {
                    this.issueInstance = new FunnelIssue().fromJSON(response.issue)
                    this.issueInstance.sessions = response.sessions.sessions.map(i => new Session().fromJson(i))
                    resolve(this.issueInstance)
                }).catch(error => {
                    reject(error)
                }
            ).finally(() => {
                this.isLoadingIssues = false
            })
        })
    }
}


const sampleIssues = [{"type":"missing_resource","title":"Missing Image","affectedSessions":1,"unaffectedSessions":59,"lostConversions":0,"affectedUsers":1,"conversionImpact":11,"contextString":"https://openreplay.com/images/assist-story-4.svg","issueId":"9157d556854f17cc25df3510bf7a980fd4d"},{"type":"click_rage","title":"Click Rage","affectedSessions":1,"unaffectedSessions":59,"lostConversions":0,"affectedUsers":1,"conversionImpact":11,"contextString":"Back More Info 0:40 78:02 Pause Back Skip to Issue 1x Skip Inactivity Network Fetch 6 Redux 2 Consol","issueId":"91502c2c13f69c09a68503c61b0fd4461ca"},{"type":"missing_resource","title":"Missing Image","affectedSessions":1,"unaffectedSessions":59,"lostConversions":0,"affectedUsers":1,"conversionImpact":11,"contextString":"https://openreplay.com/images/icn-slack.svg","issueId":"915b1b3a25c5f1127ec762235be7f896c3a"},{"type":"dead_click","title":"Dead Click","affectedSessions":1,"unaffectedSessions":59,"lostConversions":0,"affectedUsers":1,"conversionImpact":11,"contextString":"py-1 px-2 bg-white border border-gray-light rounded w-16","issueId":"9159e30220bb6a6a31afcaa1979a0c7d69c"},{"type":"dead_click","title":"Dead Click","affectedSessions":4,"unaffectedSessions":56,"lostConversions":2,"affectedUsers":2,"conversionImpact":61,"contextString":"OpenReplay App New Project SESSIONS ASSIST ERRORS DASHBOARDS Billing Details Announcements There are","issueId":"91515f9118ed803291f87133e2cb49a16ea"},{"type":"dead_click","title":"Dead Click","affectedSessions":2,"unaffectedSessions":58,"lostConversions":0,"affectedUsers":1,"conversionImpact":20,"contextString":"Type to search","issueId":"915832d68d21f03f83af1bfc758a1dda50b"},{"type":"missing_resource","title":"Missing Image","affectedSessions":1,"unaffectedSessions":59,"lostConversions":0,"affectedUsers":1,"conversionImpact":11,"contextString":"https://openreplay.com/images/icn-linkedin.svg","issueId":"91506bb929c2cb3679f8b01c228d8a0b5c8"},{"type":"dead_click","title":"Dead Click","affectedSessions":3,"unaffectedSessions":57,"lostConversions":0,"affectedUsers":2,"conversionImpact":31,"contextString":"Search sessions using any captured event (click, input, page, error...)","issueId":"9157be39a537e81243a2ff44ad74867941f"},{"type":"cpu","title":"High CPU","affectedSessions":1,"unaffectedSessions":59,"lostConversions":0,"affectedUsers":1,"conversionImpact":11,"contextString":"","issueId":"915a68d6bb4448b5822836dbc797bafadf9"},{"type":"dead_click","title":"Dead Click","affectedSessions":1,"unaffectedSessions":59,"lostConversions":0,"affectedUsers":1,"conversionImpact":11,"contextString":"Back More Info Report Issue This session's issues 10:35 83:19 Play Back Skip to Issue 4x Skip Inacti","issueId":"915b43e81f8da042f70ea47bd9ad14a3bb8"},{"type":"missing_resource","title":"Missing Image","affectedSessions":1,"unaffectedSessions":59,"lostConversions":0,"affectedUsers":1,"conversionImpact":11,"contextString":"https://openreplay.com/images/icn-git.svg","issueId":"915f7f277daa7a695d5bf9e233c43af7f02"},{"type":"click_rage","title":"Click Rage","affectedSessions":1,"unaffectedSessions":59,"lostConversions":0,"affectedUsers":1,"conversionImpact":11,"contextString":"Back More Info 0:35 78:02 Pause Back Skip to Issue 1x Skip Inactivity Network Fetch 6 Redux 2 Consol","issueId":"915788d9976c9f80c6f599e3e5816f2c7be"},{"type":"missing_resource","title":"Missing Image","affectedSessions":1,"unaffectedSessions":59,"lostConversions":0,"affectedUsers":1,"conversionImpact":11,"contextString":"https://openreplay.com/images/icn-twitter.svg","issueId":"915ab993784a0432c39b4a4e9248dfe6acd"},{"type":"missing_resource","title":"Missing Image","affectedSessions":1,"unaffectedSessions":59,"lostConversions":0,"affectedUsers":1,"conversionImpact":11,"contextString":"https://openreplay.com/images/logo-open-replay.svg","issueId":"915ac8719c95392adb8b79d2d5eae1063b9"}]