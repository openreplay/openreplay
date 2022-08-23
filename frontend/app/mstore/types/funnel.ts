import FunnelStage from './funnelStage'

export default class Funnel {
    affectedUsers: number = 0
    totalConversions: number = 0
    conversionImpact: number = 0
    lostConversions: number = 0
    lostConversionsPercentage: number = 0
    totalConversionsPercentage: number = 0
    isPublic: boolean = false
    stages: FunnelStage[] = []
    raw: any = null

    constructor() {
    }

    fromJSON(json: any) {
        if (!this.raw) {
            this.raw = json
        }
        
        if (json.stages.length >= 1) {
            const firstStage = json.stages[0]
            this.stages = json.stages ? json.stages.map((stage: any, index: number) => new FunnelStage().fromJSON(stage, firstStage.sessionsCount, index > 0 ? json.stages[index - 1].sessionsCount : stage.sessionsCount)) : []
            const filteredStages = this.stages.filter((stage: any) => stage.isActive)
            const lastStage = filteredStages[filteredStages.length - 1]
            
            this.lostConversions = firstStage.sessionsCount - lastStage.sessionsCount
            this.lostConversionsPercentage = Math.round(this.lostConversions / firstStage.sessionsCount * 100) || 0
            
            this.totalConversions = lastStage.sessionsCount
            this.totalConversionsPercentage = Math.round(this.totalConversions / firstStage.sessionsCount * 100) || 0
            
            this.conversionImpact = this.lostConversions ? Math.round((this.lostConversions / firstStage.sessionsCount) * 100) : 0;
            this.affectedUsers = firstStage.usersCount ? firstStage.usersCount - lastStage.usersCount : 0;
        }

        return this
    }
}
