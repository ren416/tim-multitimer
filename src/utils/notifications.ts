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

const nextWeekdayFrom = (base: dayjs.Dayjs, weekday: number) => {
  const diff = (weekday - base.day() + 7) % 7;
  return base.add(diff, 'day');
};

const nthWeekdayOfMonth = (
  year: number,
  month: number,
  nth: number,
  weekday: number,
) => {
  let d = dayjs().year(year).month(month - 1).date(1);
  let count = 0;
  while (true) {
    if (d.day() === weekday) {
      count += 1;
      if (count === nth) break;
    }
    d = d.add(1, 'day');
  }
  return d;
};

export const scheduleTimerSetNotification = async (
  set: Pick<TimerSet, 'name' | 'notifications'>,
): Promise<string[]> => {
  const cfg: NotificationConfig | undefined = set.notifications;
  if (!cfg?.enabled) return [];
  await Notifications.requestPermissionsAsync();
  const base = dayjs(`${cfg.date}T${cfg.time}`);
  const ids: string[] = [];
  const content = {
    title: 'タイマー通知',
    body: `${set.name}の時間です！`,
  };

  if (!cfg.repeat) {
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: base.toDate() as any,
    });
    ids.push(id);
    return ids;
  }

  if (cfg.repeat.mode === 'interval') {
    const sec = unitToSeconds(cfg.repeat.every, cfg.repeat.unit);
    const trigger: Notifications.TimeIntervalTriggerInput = {
      seconds: sec,
      repeats: true,
      startDate: base.toDate(),
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    } as any;
    const id = await Notifications.scheduleNotificationAsync({ content, trigger });
    ids.push(id);
  } else if (cfg.repeat.mode === 'weekday') {
    for (const wd of cfg.repeat.weekdays) {
      const first = nextWeekdayFrom(base, wd);
      let trigger: Notifications.NotificationTriggerInput;
      if (cfg.repeat.intervalWeeks === 1) {
        trigger = {
          weekday: wd + 1,
          hour: base.hour(),
          minute: base.minute(),
          repeats: true,
        } as any;
      } else {
        trigger = {
          seconds: cfg.repeat.intervalWeeks * 7 * 86400,
          repeats: true,
          startDate: first.toDate(),
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        } as any;
      }
      const id = await Notifications.scheduleNotificationAsync({ content, trigger });
      ids.push(id);
    }
  } else if (cfg.repeat.mode === 'monthly') {
    const first = nthWeekdayOfMonth(
      base.year(),
      base.month() + 1,
      cfg.repeat.nthWeek,
      cfg.repeat.weekday,
    ).hour(base.hour()).minute(base.minute());
    const trigger: Notifications.TimeIntervalTriggerInput = {
      seconds: 30 * 24 * 3600,
      repeats: true,
      startDate: first.toDate(),
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    } as any;
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
