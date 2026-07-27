import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { notificationsApi } from '../api/client';

// Best-effort only, by design: as of SDK 53+, Expo Go no longer supports
// remote push delivery on either platform (only a standalone/dev-client
// build does) — see docs/03_System_Architecture.md §7. Every step here is
// wrapped so a missing projectId, a simulator, or a denied permission all
// fail quietly rather than breaking the app. The in-app notification list
// (GET /notifications/mine) works regardless of any of this.
export async function registerForPushNotificationsAsync(token: string): Promise<boolean> {
  try {
    if (!Device.isDevice) {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') {
      return false;
    }

    // No EAS projectId is configured in app.json yet; getExpoPushTokenAsync
    // relies on auto-detecting one and throws if it can't, which the
    // catch block below treats the same as any other "push unavailable" case.
    const pushToken = await Notifications.getExpoPushTokenAsync();
    await notificationsApi.registerDevice(token, pushToken.data);
    return true;
  } catch (error) {
    console.log('Push notification registration skipped:', error);
    return false;
  }
}

export async function unregisterPushNotifications(token: string): Promise<void> {
  try {
    await notificationsApi.unregisterDevice(token);
  } catch {
    // Best-effort; nothing actionable if this fails.
  }
}
