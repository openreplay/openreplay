import { runInAction, makeAutoObservable, observable } from 'mobx'
import { List, Map } from 'immutable';
import { DateTime, Duration } from 'luxon';

const HASH_MOD = 1610612741;
const HASH_P = 53;
function hashString(s: string): number {
  let mul = 1;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash + s.charCodeAt(i) * mul) % HASH_MOD;
    mul = (mul*HASH_P) % HASH_MOD;
  }
  return hash;
}

export default class Session {
    sessionId: string = "";
    viewed: boolean = false
    duration: number = 0
    metadata: any = Map()
    startedAt: number = 0
    userBrowser: string = ""
    userOs: string = ""
    userId: string = ""
    userDeviceType: string = ""
    userCountry: string = ""
    eventsCount: number = 0
    userNumericHash: number = 0
    userDisplayName: string = ""

    constructor() {
        makeAutoObservable(this, {
            sessionId: observable,
        })
    }

    fromJson(session: any) {
        runInAction(() => {
            Object.keys(session).forEach(key => {
                this[key] = session[key]
            })

            const { startTs, timestamp } = session;
            const startedAt = +startTs || +timestamp;

            this.sessionId = session.sessionId
            this.viewed = session.viewed
            this.duration = Duration.fromMillis(session.duration < 1000 ? 1000 : session.duration);
            this.metadata = Map(session.metadata)
            this.startedAt = startedAt
            this.userBrowser = session.userBrowser
            this.userOs = session.userOs
            this.userId = session.userId
            this.userDeviceType = session.userDeviceType
            this.eventsCount = session.eventsCount
            this.userCountry = session.userCountry
            this.userNumericHash = hashString(session.userId || session.userAnonymousId || session.userUuid || session.userID || session.userUUID || "")
            this.userDisplayName = session.userId || session.userAnonymousId || session.userID || 'Anonymous User'
        })  
        return this
    }
}
