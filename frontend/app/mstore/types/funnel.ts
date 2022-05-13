import Filter, { IFilter } from "./filter"

export interface IFunnel {
    funnelId: string
    name: string
    filter: IFilter
    sessionsCount: number
    conversionRate: number
    totalConversations: number
    lostConversations: number
    isPublic: boolean
    fromJSON: (json: any) => void
    toJSON: () => any
    exists: () => boolean
}

export default class Funnel implements IFunnel {
    funnelId: string =  ''
    name: string = ''
    filter: IFilter = new Filter()
    sessionsCount: number = 0
    conversionRate: number = 0
    totalConversations: number = 0
    lostConversations: number = 0
    isPublic: boolean = false

    constructor() {
    }

    fromJSON(json: any) {
        this.funnelId = json.funnelId
        this.name = json.name
        this.filter = new Filter().fromJson(json.filter)
        this.sessionsCount = json.sessionsCount
        this.conversionRate = json.conversionRate
        return this
    }

    toJSON(): any {
        return {
            funnelId: this.funnelId,
            name: this.name,
            filter: this.filter.toJson(),
            sessionsCount: this.sessionsCount,
            conversionRate: this.conversionRate,
        }
    }

    exists(): boolean {
        return this.funnelId !== ''
    }
}