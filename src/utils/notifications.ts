import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import { Timer, TimerSet, NotificationConfig, RepeatIntervalUnit } from '../context/TimerContext';

// Expo の通知機能を用いてタイマー終了や予約通知をスケジュールするためのヘルパー群

const unitSeconds: Record<RepeatIntervalUnit, number> = {
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 7 * 86400,
  year: 365 * 86400,
};

const unitToSeconds = (every: number, unit: string) =>
  (unitSeconds[unit as RepeatIntervalUnit] ?? 60) * every;

// 通知権限を確認し、未許可の場合はリクエストする
const ensurePermissions = async () => {
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
};

// 個別タイマーが終了する際の単発通知を設定
export const scheduleEndNotification = async (
  sec: number,
  timer?: Timer,
  withSound: boolean = true,
) => {
  try {
    await Notifications.requestPermissionsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'タイマー終了',
        body: `${timer?.label ?? 'タイマー'} が終了しました`,
        sound: withSound ? true : undefined,
      },
      trigger: {
        seconds: sec,
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      }
    });
  } catch(e) {
    console.warn('Notification schedule failed', e);
  }
};

// タイマーセット全体の開始を通知する予約を設定
export const scheduleTimerSetNotification = async (
  set: Pick<TimerSet, 'name' | 'notifications'>,
): Promise<string[]> => {
  const cfg: NotificationConfig | undefined = set.notifications;
  if (!cfg?.enabled) return [];

  if (!(await ensurePermissions())) {
    console.warn('Notification permissions not granted');
    return [];
  }

  const base = dayjs(`${cfg.date}T${cfg.time}`);
  const content: Notifications.NotificationContentInput = {
    title: 'タイマー通知',
    body: `${set.name}の時間です！`,
  };

  if (!cfg.repeat) {
    const triggerDate = base.toDate();
    if (dayjs(triggerDate).isAfter(dayjs())) {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });
      return [id];
    }
    return [];
  }

  const ids: string[] = [];
  switch (cfg.repeat.mode) {
    case 'interval': {
      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: unitToSeconds(cfg.repeat.every, cfg.repeat.unit),
        repeats: true,
      };
      const id = await Notifications.scheduleNotificationAsync({ content, trigger });
      ids.push(id);
      break;
    }
    case 'weekday': {
      for (const wd of cfg.repeat.weekdays) {
        const notificationWd = wd + 1;
        const trigger: Notifications.NotificationTriggerInput =
          cfg.repeat.intervalWeeks === 1
            ? {
                type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                weekday: notificationWd,
                hour: base.hour(),
                minute: base.minute(),
                repeats: true,
              }
            : {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: cfg.repeat.intervalWeeks * 7 * 86400,
                repeats: true,
              };
        const id = await Notifications.scheduleNotificationAsync({ content, trigger });
        ids.push(id);
      }
      break;
    }
    case 'monthly': {
      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        weekday: cfg.repeat.weekday + 1,
        weekOfMonth: cfg.repeat.nthWeek,
        hour: base.hour(),
        minute: base.minute(),
        repeats: true,
      };
      const id = await Notifications.scheduleNotificationAsync({ content, trigger });
      ids.push(id);
      break;
    }
  }

  return ids;
};

// 予約した通知をキャンセル
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