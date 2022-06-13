import FunnelStage from './funnelStage'

export interface IFunnel {
    affectedUsers: number;
    conversionImpact: number
    lostConversions: number
    isPublic: boolean
    fromJSON: (json: any) => void
    toJSON: () => any
    exists: () => boolean
}

export default class Funnel implements IFunnel {
    affectedUsers: number = 0
    conversionImpact: number = 0
    lostConversions: number = 0
    isPublic: boolean = false
    stages: FunnelStage[] = []

    constructor() {
    }

    fromJSON(json: any) {
        if (json.stages.length >= 1) {
            const firstStage = json.stages[0]
            const lastStage = json.stages[json.stages.length - 1]
            this.lostConversions = json.totalDropDueToIssues
            this.conversionImpact = this.lostConversions ? Math.round((this.lostConversions / firstStage.sessionsCount) * 100) : 0;
            this.stages = json.stages ? json.stages.map((stage: any) => new FunnelStage().fromJSON(stage)) : []
            this.affectedUsers = firstStage.usersCount ? firstStage.usersCount - lastStage.usersCount : 0;
        }

        return this
    }
}