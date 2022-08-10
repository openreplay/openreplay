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
    lostConversionsPer: number = 0
    affectedSessionsPer: number = 0
    unaffectedSessionsPer: number = 0
    icon: any = {}
    sessions: any[] = []

    constructor() {
    }

    fromJSON(json: any) {
        this.issueId = json.issueId
        this.title = json.title
        this.type = json.type
        this.icon = getIconDetails(json.type)
        this.affectedSessions = json.affectedSessions
        this.affectedUsers = json.affectedUsers
        this.unaffectedSessions = json.unaffectedSessions
        this.contextString = json.contextString
        this.conversionImpact = json.conversionImpact
        this.lostConversions = json.lostConversions

        const total = json.lostConversions + json.affectedSessions + json.unaffectedSessions;
        this.lostConversionsPer = json.lostConversions * 100 / total;
        this.affectedSessionsPer = json.affectedSessions * 100 / total;
        this.unaffectedSessionsPer = json.unaffectedSessions * 100 / total;
        return this
    }
}


const getIconDetails = (type) => {
    switch(type) {
      case 'click_rage':
        return { icon: 'funnel/emoji-angry-fill', color: '#CC0000' };
      case 'dead_click':
        return { icon: 'funnel/emoji-dizzy-fill', color: '#9C001F' };
      case 'excessive_scrolling':
        return { icon: 'funnel/mouse', color: '#D3545F' };
      case 'bad_request':
        return { icon: 'funnel/patch-exclamation-fill', color: '#D70072' };
      case 'missing_resource':
        return { icon: 'funnel/image-fill', color: '#B89C50' };
      case 'memory':
        return { icon: 'funnel/cpu-fill', color: '#8A5A83' };
      case 'cpu':
        return { icon: 'funnel/hdd-fill', color: '#8A5A83' };
      case 'slow_resource':
        return { icon: 'funnel/hourglass-top', color: '#8B006D' };
      case 'slow_page_load':
        return { icon: 'funnel/hourglass-top', color: '#8B006D' };
      case 'custom_event_error':
      case 'custom':
        return { icon: 'funnel/exclamation-circle-fill', color: '#BF6C00' };
      case 'crash':
        return { icon: 'funnel/file-x', color: '#BF2D00' };
      case 'js_exception':
        return { icon: 'funnel/exclamation-circle', color: '#BF2D00' };
    }
  
    return {
      icon: 'info',
      color: 'red'
    }
  }