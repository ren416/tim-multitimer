import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import { Platform } from 'react-native';
import { Timer, TimerSet, NotificationConfig, RepeatIntervalUnit } from '../context/TimerContext';

// Expo の通知機能を用いてタイマー終了や予約通知をスケジュールするためのヘルパー群

// 繰り返し設定で使用する単位を秒に変換するための対応表
const unitSeconds: Record<RepeatIntervalUnit, number> = {
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 7 * 86400,
  year: 365 * 86400, // うるう年は考慮しない簡易計算
};

/**
 * 「n単位ごと」の繰り返し設定を秒へ変換する。
 * @param every 何単位ごとに繰り返すか
 * @param unit 単位 (minute/hour/day/week/year)
 * @returns 指定間隔を秒に換算した値
 */
const unitToSeconds = (every: number, unit: string): number =>
  (unitSeconds[unit as RepeatIntervalUnit] ?? 60) * every;

/**
 * 通知権限を確認し、未許可であればユーザーにリクエストを表示する。
 * @returns 権限が付与されていれば true。
 */
const ensurePermissions = async (): Promise<boolean> => {
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
};

/**
 * 個別タイマー終了時の通知を設定する。
 * @param sec 何秒後に通知するか
 * @param timer 通知本文に使用するタイマー情報
 * @param withSound trueの場合は通知音を鳴らす
 */
export const scheduleEndNotification = async (
  sec: number,
  timer?: Timer,
  withSound: boolean = true,
): Promise<string | null> => {
  try {
    if (!(await ensurePermissions())) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('timer', {
        name: 'Timer',
        importance: Notifications.AndroidImportance.HIGH,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const content: Notifications.NotificationContentInput = {
      title: 'タイマー終了',
      body: `${timer?.label ?? 'タイマー'} が終了しました`,
      android: {
        channelId: 'timer',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
    } as any;

    if (withSound) {
      (content as any).sound = true;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        seconds: sec,
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      },
    });
    return id;
  } catch (e) {
    console.warn('Notification schedule failed', e);
    return null;
  }
};

/**
 * タイマーセットの開始時刻を予約通知する。
 * @param set タイマーセット名と通知設定
 * @returns 予約した通知IDの配列
 */
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

/**
 * 予約済みの通知をキャンセルする。
 * @param ids キャンセルしたい通知ID（単一または配列）
 */
export const cancelTimerSetNotification = async (ids?: string | string[]): Promise<void> => {
  const arr = Array.isArray(ids) ? ids : ids ? [ids] : [];
  for (const id of arr) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      console.warn('Failed to cancel notification', e);
    }
  }
};