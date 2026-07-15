import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';

const BASE_URL = 'https://noun-study-buddy.onrender.com';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const { token, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) return;

    registerForPushNotificationsAsync().then(pushToken => {
      if (pushToken && pushToken !== expoPushToken) {
        setExpoPushToken(pushToken);
        // Send token to backend
        fetch(`${BASE_URL}/api/push-token/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`
          },
          body: JSON.stringify({ expo_push_token: pushToken })
        }).catch(err => console.error('Failed to save push token', err));
      }
    });
  }, [isLoggedIn, token]);

  return expoPushToken;
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
      return;
    }
    
    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
    } catch (e) {
      console.log('Could not get token', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
