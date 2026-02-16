import { messaging } from "../lib/firebase";
import { getToken } from "firebase/messaging";
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const VAPID_KEY = "BBu_aONVhOmmgGpK_1bGxgJ0z7i2kFw6qRAqzUuFjbOaWBInAqI5acsCfLl4jOOe7Ssz9tJ2Z3K9TXP_x89Pwbo";

export const PushNotificationService = {
    requestPermission: async () => {
        try {
            if (Capacitor.isNativePlatform()) {
                // Native Logic
                let permStatus = await PushNotifications.checkPermissions();

                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }

                if (permStatus.receive !== 'granted') {
                    console.log('User denied permissions!');
                    return null;
                }

                await PushNotifications.register();

                // Note: On native, the token is received via a listener, not returned immediately by register().
                // However, for this simple check, successful registration is enough.
                // We'll add listeners separately in the app initialization.
                return "native-registered";

            } else {
                // Web Logic
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const token = await getToken(messaging, {
                        vapidKey: VAPID_KEY
                    });
                    console.log("FCM Token:", token);
                    return token;
                } else {
                    console.log("Permission denied");
                    return null;
                }
            }
        } catch (error) {
            console.error("Error getting token", error);
            return null;
        }
    },

    initializeListeners: async () => {
        if (!Capacitor.isNativePlatform()) return;

        await PushNotifications.addListener('registration', token => {
            console.info('Push registration success, token: ' + token.value);
            // TODO: Send token.value to backend
        });

        await PushNotifications.addListener('registrationError', err => {
            console.error('Error on registration: ' + JSON.stringify(err));
        });

        await PushNotifications.addListener('pushNotificationReceived', notification => {
            console.log('Push received: ' + JSON.stringify(notification));
        });
    }
};
