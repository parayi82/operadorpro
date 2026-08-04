import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

// Configurar cómo se comportan las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  // Solicitar permisos
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission denied');
    return null;
  }

  // Obtener token de push
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'operadorpro-mobile', // Cambiar por el tuyo
  });

  return token.data;
}

export async function savePushToken(userId: string, token: string) {
  try {
    // Guardar token en tabla de usuarios
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) {
      console.error('Error saving push token:', error);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

export async function schedulePushNotification(
  title: string,
  body: string,
  delay: number = 5000
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      badge: 1,
    },
    trigger: { seconds: Math.ceil(delay / 1000) },
  });
}

export async function setupNotificationListeners() {
  // Escuchar notificaciones recibidas mientras la app está en foreground
  const notificationListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received:', notification);
    }
  );

  // Escuchar cuando el usuario toca una notificación
  const responseListener = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('Notification tapped:', response);
      // Aquí puedes navegar a la pantalla correspondiente
    }
  );

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
