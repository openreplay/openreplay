import { DateTime } from 'luxon';

export default class Notification {
    notificationId: string
    level: string
    editedAt: string
    createdAt: string
    text: string
    link: string
    viewed: boolean
    title: string
    description: string
    type: string
    filterKey: string
    options: any = { source: '', sourceId: '', projectId: '', sourceMeta: ''}

    constructor() {
    }

    fromJson(json: any) {
        this.notificationId = json.notificationId
        this.level = json.level
        this.editedAt = json.editedAt && DateTime.fromMillis(json.editedAt || 0);
        this.createdAt = json.createdAt && DateTime.fromMillis(json.createdAt || 0);
        this.text = json.text
        this.link = json.link
        this.viewed = json.viewed
        this.title = json.title
        this.description = json.description
        this.type = json.type
        this.filterKey = json.filterKey
        this.options = json.options
        return this
    }
}