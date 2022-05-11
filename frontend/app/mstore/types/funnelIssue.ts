export default class FunnelIssue {
    issueId: string = ''
    title: string = ''
    type: string = ''
    affectedSessions: number = 0
    affectedUsers: number = 0
    unaffectedSessions: number = 0
    contextString: string = ''
    conversionImpact: number = 0
    lostConversions: number = 0

    constructor() {
    }

    fromJSON(json: any) {
        this.issueId = json.issueId
        this.title = json.title
        this.type = json.type
        this.affectedSessions = json.affectedSessions
        this.affectedUsers = json.affectedUsers
        this.unaffectedSessions = json.unaffectedSessions
        this.contextString = json.contextString
        this.conversionImpact = json.conversionImpact
        this.lostConversions = json.lostConversions
        return this
    }
}