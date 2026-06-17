import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { axiosClient } from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const { token } = useAuthStore();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!token) return;

    registerForPushNotificationsAsync().then(pushToken => {
      if (pushToken) {
        setExpoPushToken(pushToken);
        // Send token to backend
        axiosClient.put('/users/me/push-token', { token: pushToken }).catch(console.error);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Notification received in foreground
      console.log('Push received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // User tapped the notification
      const data = response.notification.request.content.data;
      console.log('User tapped push:', data);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [token]);

  return { expoPushToken };
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return null;
  }

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
         token = (await Notifications.getExpoPushTokenAsync()).data;
      } else {
         token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      }
    } catch (e) {
      console.error(e);
      token = (await Notifications.getExpoPushTokenAsync()).data;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
