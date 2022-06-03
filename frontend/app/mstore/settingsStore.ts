import { makeAutoObservable, observable, action } from "mobx"
import SessionSettings from "./types/sessionSettings"
import { sessionService } from "App/services"
import { toast } from 'react-toastify';

export default class SettingsStore {
    loadingCaptureRate: boolean = false;
    sessionSettings: SessionSettings = new SessionSettings()
    captureRateFetched: boolean = false;
    constructor() {
        makeAutoObservable(this, {
            sessionSettings: observable,
        })
    }

    saveCaptureRate(data: any) {
        return sessionService.saveCaptureRate(data)
            .then(data => {
                this.sessionSettings.merge({
                    captureRate: data.rate,
                    captureAll: data.captureAll
                })
                toast.success("Settings updated successfully");
            }).catch(err => {
                toast.error("Error saving capture rate");
            })
    }

    fetchCaptureRate(): Promise<any> {
        this.loadingCaptureRate = true;
        return sessionService.fetchCaptureRate()
            .then(data => {
                this.sessionSettings.merge({
                    captureRate: data.rate,
                    captureAll: data.captureAll
                })
                this.captureRateFetched = true;
            }).finally(() => {
                this.loadingCaptureRate = false;
            })
    }
}
