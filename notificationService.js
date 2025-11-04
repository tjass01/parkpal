import * as Notifications from 'expo-notifications';

export async function triggerNotification(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null, 
  });
}
