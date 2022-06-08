import { action, makeAutoObservable, observable } from "mobx";
import { userService } from 'App/services';
import Notification from './types/notification';

export default class NotificationStore {
    notificationsCount: any = 0;
    notifications: any = [];

    constructor() {
        makeAutoObservable(this, {
            notificationsCount: observable,
            notifications: observable,
            
            fetchNotificationsCount: action,
            fetchNotifications: action,
        });
    }

    fetchNotifications(): Promise<any> {
        return new Promise((resolve, reject) => {
            userService.getNotifications()
                .then((response: any) => {
                    this.notifications = response.map((notification: any) => new Notification().fromJson(notification));
                    resolve(response);
                }).catch((error: any) => {
                    reject(error);
                });
        });
    }

    fetchNotificationsCount(): Promise<any> {
        return new Promise((resolve, reject) => {
            userService.getNotificationsCount()
                .then((response: any) => {
                    this.notificationsCount = response.count;
                    resolve(response);
                }).catch((error: any) => {
                    reject(error);
                });
        });
    }
}