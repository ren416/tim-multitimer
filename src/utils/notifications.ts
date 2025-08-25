import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import { TimerSet, NotificationConfig } from '../context/TimerContext';

const unitToSeconds = (every: number, unit: string) => {
  switch (unit) {
    case 'minute':
      return every * 60;
    case 'hour':
      return every * 3600;
    case 'day':
      return every * 86400;
    case 'week':
      return every * 7 * 86400;
    case 'year':
      return every * 365 * 86400;
    default:
      return every * 60;
  }
};

export const scheduleTimerSetNotification = async (
  set: Pick<TimerSet, 'name' | 'notifications'>,
): Promise<string[]> => {
  const cfg: NotificationConfig | undefined = set.notifications;
  if (!cfg?.enabled) return [];

  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    const result = await Notifications.requestPermissionsAsync();
    if (!result.granted) {
      console.warn('Notification permissions not granted');
      return [];
    }
  }

  const base = dayjs(`${cfg.date}T${cfg.time}`);
  const ids: string[] = [];
  const content: Notifications.NotificationContentInput = {
    title: 'タイマー通知',
    body: `${set.name}の時間です！`,
  };

  if (!cfg.repeat) {
    const triggerDate = base.toDate();
    if (dayjs(triggerDate).isAfter(dayjs())) {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate.getTime(),
        },
      });
      ids.push(id);
    }
    return ids;
  }

  let trigger: Notifications.NotificationTriggerInput | null = null;

  if (cfg.repeat.mode === 'interval') {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: unitToSeconds(cfg.repeat.every, cfg.repeat.unit),
      repeats: true,
    };
    const id = await Notifications.scheduleNotificationAsync({ content, trigger });
    ids.push(id);
  } else if (cfg.repeat.mode === 'weekday') {
    for (const wd of cfg.repeat.weekdays) {
      const notificationWd = wd + 1;
      let weeklyTrigger: Notifications.NotificationTriggerInput;

      if (cfg.repeat.intervalWeeks === 1) {
        weeklyTrigger = {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: notificationWd,
          hour: base.hour(),
          minute: base.minute(),
          repeats: true,
        };
      } else {
        weeklyTrigger = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: cfg.repeat.intervalWeeks * 7 * 86400,
          repeats: true,
        };
      }
      const id = await Notifications.scheduleNotificationAsync({ content, trigger: weeklyTrigger });
      ids.push(id);
    }
  } else if (cfg.repeat.mode === 'monthly') {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      weekday: cfg.repeat.weekday + 1,
      weekOfMonth: cfg.repeat.nthWeek,
      hour: base.hour(),
      minute: base.minute(),
      repeats: true,
    };
    const id = await Notifications.scheduleNotificationAsync({ content, trigger });
    ids.push(id);
  }

  return ids;
};

export const cancelTimerSetNotification = async (ids?: string | string[]) => {
  const arr = Array.isArray(ids) ? ids : ids ? [ids] : [];
  for (const id of arr) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      console.warn('Failed to cancel notification', e);
    }
  }
};