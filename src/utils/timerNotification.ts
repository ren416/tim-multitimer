import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatHMS } from './format';

// タイマーの進行状況を常駐通知として表示し、
// 通知から開始・停止・リセットを行えるようにするユーティリティ。

let currentNotificationId: string | null = null;
let responseSub: Notifications.Subscription | null = null;

/**
 * 通知チャンネル（Android）や通知アクションのカテゴリを登録する。
 * 初期化時に一度だけ呼び出す。
 */
export const initTimerNotification = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }

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

// 通知からの操作に対応するコールバック群
type Handlers = {
  onStart: () => void; // 開始ボタン押下時
  onPause: () => void; // 停止ボタン押下時
  onReset: () => void; // リセットボタン押下時
};

/**
 * 通知上のアクションが押された際にコールバックを実行するリスナーを登録する。
 */
export const registerTimerActionHandler = (handlers: Handlers): void => {
  if (Platform.OS === 'web') return;

  responseSub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const action = resp.actionIdentifier;
    if (action === 'START') handlers.onStart();
    if (action === 'PAUSE') handlers.onPause();
    if (action === 'RESET') handlers.onReset();
  });
};

/**
 * 通知アクションのリスナーを解除する。
 */
export const unregisterTimerActionHandler = (): void => {
  if (Platform.OS === 'web') return;

  responseSub?.remove();
  responseSub = null;
};

/**
 * 常駐通知を表示または更新する。
 * @param setName タイマーセット名
 * @param timerName 現在のタイマー名
 * @param remainingSec 残り秒数
 */
export const updateTimerNotification = async (
  setName: string,
  timerName: string,
  remainingSec: number,
): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }

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
      sound: false,
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
 * 表示中の常駐通知をクリアする。
 */
export const clearTimerNotification = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }

  if (currentNotificationId) {
    try {
      await Notifications.dismissNotificationAsync(currentNotificationId);
    } catch {}
    currentNotificationId = null;
  }
};

