import * as Notifications from 'expo-notifications';
import { TimerSet } from '../context/TimerContext';

export const scheduleTimerSetNotification = async (set: Pick<TimerSet, 'name' | 'notifications'>) => {
  if (!set.notifications?.enabled) return undefined;
  await Notifications.requestPermissionsAsync();
  let trigger: Notifications.NotificationTriggerInput;
  if (set.notifications.scheduleType === 'interval') {
    const sec = set.notifications.intervalSec ?? 60;
    trigger = {
      seconds: sec,
      repeats: true,
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    } as any;
  } else {
    const when = set.notifications.dateTime ? new Date(set.notifications.dateTime) : new Date();
    trigger = when as any;
  }
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'タイマー通知',
      body: `${set.name}の時間です！`,
    },
    trigger,
  });
  return id;
};

export const cancelTimerSetNotification = async (id?: string) => {
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      console.warn('Failed to cancel notification', e);
    }
  }
};
