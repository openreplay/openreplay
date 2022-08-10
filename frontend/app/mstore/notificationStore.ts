import { action, makeAutoObservable, observable } from "mobx";
import { userService } from 'App/services';
import Notification from './types/notification';

export default class NotificationStore {
    loading: boolean = false;
    markingAsRead: boolean = false;
    notificationsCount: any = 0;
    notifications: any = [];

    constructor() {
        makeAutoObservable(this, {
            loading: observable,
            notificationsCount: observable,
            notifications: observable,
            
            fetchNotificationsCount: action,
            fetchNotifications: action,
            ignoreAllNotifications: action,
            ignoreNotification: action,
            setNotificationsCount: action,
        });
    }

    fetchNotifications(): Promise<any> {
        this.loading = true;
        return new Promise((resolve, reject) => {
            userService.getNotifications()
                .then((response: any) => {
                    this.notifications = response.map((notification: any) => new Notification().fromJson(notification));
                    resolve(response);
                }).catch((error: any) => {
                    reject(error);
                }).finally(() => {
                    this.loading = false;
                });
        });
    }

    ignoreAllNotifications(params: any): Promise<any> {
        return new Promise((resolve, reject) => {
            userService.ignoreAllNotifications(params)
                .then((response: any) => {
                    this.notifications = this.notifications.map((notification: any) => {
                        notification.viewed = true;
                        return notification;
                    });
                    this.fetchNotificationsCount();
                    resolve(response);
                }).catch((error: any) => {
                    reject(error);
                });
        });
    }

    ignoreNotification(notificationId: number): Promise<any> {
        this.markingAsRead = true;
        return new Promise((resolve, reject) => {
            userService.ignoreNotification(notificationId)
                .then((response: any) => { 
                    // updates notifications item
                    this.notifications = this.notifications.map((notification: any) => {
                        if (notification.notificationId === notificationId) {
                            notification.viewed = true;
                        }
                        return notification;
                    });
                    this.fetchNotificationsCount();
                    resolve(response);
                }).catch((error: any) => {
                    reject(error);
                }).finally(() => {
                    this.markingAsRead = false;
                });
        });
    }

    setNotificationsCount(count: number) {
        this.notificationsCount = count;
    }

    fetchNotificationsCount(): Promise<any> {
        return new Promise((resolve, reject) => {
            userService.getNotificationsCount()
                .then((response: any) => {
                    this.setNotificationsCount(response.count);
                    resolve(response);
                }).catch((error: any) => {
                    reject(error);
                });
        });
    }
}
