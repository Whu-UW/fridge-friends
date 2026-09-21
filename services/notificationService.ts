import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

/**
 * Registers the device for push notifications and returns the Expo push token.
 * 
 * @returns {Promise<string | null>} The Expo push token or null if permission was denied or project ID is missing.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  
  if (!Device.isDevice) {
    Alert.alert(
      'Push Notifications Disabled',
      'Must use a physical device for Push Notifications.'
    );
    console.warn('Must use physical device for Push Notifications');
    return null;
  }

  if (isExpoGo) {
    Alert.alert(
      'Push Notifications Disabled',
      'Push notifications are not fully supported in Expo Go. Please use a development build.'
    );
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  
  if (!projectId) {
    console.warn('EAS Project ID is not configured. Push notifications may not work.');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Configures how the app handles notifications while in the foreground.
 */
export function setupForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Adds a listener for when a user interacts with a notification (e.g., taps on it).
 * 
 * @param callback The function to call when a notification response is received.
 * @returns A subscription object that can be used to remove the listener.
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Adds a listener for when a notification is received while the app is in the foreground.
 * 
 * @param callback The function to call when a notification is received.
 * @returns A subscription object that can be used to remove the listener.
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}
