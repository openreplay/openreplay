import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import SessionSettings from "./types/sessionSettings"

export default class SettingsStore {
    sessionSettings: SessionSettings = new SessionSettings()
    constructor() {
        makeAutoObservable(this, {
            sessionSettings: observable,
        })
    }

    updateCaptureRate(value: number) {
        this.sessionSettings.updateKey('captureRate', value);
    }
}