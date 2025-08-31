import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatHMS } from './format';

// Manage showing a single persistent notification with timer controls.

let currentNotificationId: string | null = null;
let responseSub: Notifications.Subscription | null = null;

/**
 * Ensure notification channel (Android) and category with actions are set up.
 */
export const initTimerNotification = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('timer', {
      name: 'Timer',
      importance: Notifications.AndroidImportance.HIGH,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  await Notifications.requestPermissionsAsync();

  await Notifications.setNotificationCategoryAsync('TIMER_CONTROLS', [
    { identifier: 'START', buttonTitle: '開始' },
    { identifier: 'PAUSE', buttonTitle: '停止' },
    { identifier: 'RESET', buttonTitle: 'リセット', options: { isDestructive: true } },
  ]);
};

type Handlers = {
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
};

/**
 * Listen for notification action presses and invoke the provided callbacks.
 */
export const registerTimerActionHandler = (handlers: Handlers): void => {
  responseSub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const action = resp.actionIdentifier;
    if (action === 'START') handlers.onStart();
    if (action === 'PAUSE') handlers.onPause();
    if (action === 'RESET') handlers.onReset();
  });
};

/**
 * Remove notification action listener.
 */
export const unregisterTimerActionHandler = (): void => {
  responseSub?.remove();
  responseSub = null;
};

/**
 * Show or update the persistent timer notification.
 * @param setName Name of the timer set
 * @param timerName Name of the current timer
 * @param remainingSec Remaining seconds for the timer
 */
export const updateTimerNotification = async (
  setName: string,
  timerName: string,
  remainingSec: number,
): Promise<void> => {
  const body = `${timerName} 残り ${formatHMS(remainingSec)}`;

  if (currentNotificationId) {
    try {
      await Notifications.dismissNotificationAsync(currentNotificationId);
    } catch {}
  }

  currentNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: setName,
      body,
      categoryIdentifier: 'TIMER_CONTROLS',
      sound: null,
      android: {
        channelId: 'timer',
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true,
        color: '#2196f3',
      },
    } as any,
    trigger: null,
  });
};

/**
 * Clear the persistent timer notification if present.
 */
export const clearTimerNotification = async (): Promise<void> => {
  if (currentNotificationId) {
    try {
      await Notifications.dismissNotificationAsync(currentNotificationId);
    } catch {}
    currentNotificationId = null;
  }
};

