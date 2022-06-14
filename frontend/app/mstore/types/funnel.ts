import FunnelStage from './funnelStage'

export interface IFunnel {
    affectedUsers: number;
    totalConversions: number;
    totalConversionsPercentage: number;
    conversionImpact: number
    lostConversions: number
    lostConversionsPercentage: number
    isPublic: boolean
    fromJSON: (json: any) => void
    toJSON: () => any
    exists: () => boolean
}

export default class Funnel implements IFunnel {
    affectedUsers: number = 0
    totalConversions: number = 0
    conversionImpact: number = 0
    lostConversions: number = 0
    lostConversionsPercentage: number = 0
    totalConversionsPercentage: number = 0
    isPublic: boolean = false
    stages: FunnelStage[] = []

    constructor() {
    }

    fromJSON(json: any) {
        if (json.stages.length >= 1) {
            const firstStage = json.stages[0]
            const lastStage = json.stages[json.stages.length - 1]
            this.lostConversions = firstStage.sessionsCount - lastStage.sessionsCount
            this.lostConversionsPercentage = this.lostConversions / firstStage.sessionsCount * 100
            this.totalConversions = lastStage.sessionsCount
            this.totalConversionsPercentage = this.totalConversions / firstStage.sessionsCount * 100
            this.conversionImpact = this.lostConversions ? Math.round((this.lostConversions / firstStage.sessionsCount) * 100) : 0;
            this.stages = json.stages ? json.stages.map((stage: any, index: number) => new FunnelStage().fromJSON(stage, firstStage.sessionsCount, index > 0 ? json.stages[index - 1].sessionsCount : stage.sessionsCount)) : []
            this.affectedUsers = firstStage.usersCount ? firstStage.usersCount - lastStage.usersCount : 0;
        }

        return this
    }
}