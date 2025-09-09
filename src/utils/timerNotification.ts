import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatHMS } from './format';

// タイマーの進行状況を常駐通知として表示し、
// 通知上のボタンから開始・停止・リセットといった操作を行えるようにするユーティリティ。
// アプリがバックグラウンドにいる間もユーザーがタイマーを操作できるようにするのが目的。

// 現在表示している通知の ID を保持しておく。更新時に前回の通知を消すために利用。
let currentNotificationId: string | null = null;
// 通知アクションからのイベント購読ハンドル。不要になったら解除する必要がある。
let responseSub: Notifications.Subscription | null = null;

/**
 * 通知チャンネル（Android）や通知アクションのカテゴリを登録する。
 * 初期化時に一度だけ呼び出す。
 */
export const initTimerNotification = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }

  // Android では通知チャンネルを事前に登録しておかないと通知が表示されない。
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('timer', {
      name: 'Timer',
      importance: Notifications.AndroidImportance.HIGH,
      bypassDnd: true, // おやすみモードを無視して通知する
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  // 通知を操作するための権限を要求
  await Notifications.requestPermissionsAsync();

  // 通知上に表示するボタンのカテゴリを登録。これにより OS からのアクションを受け取れる。
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

  // 通知上のボタンが押されたときに呼び出されるリスナーを登録。
  // このリスナーはアプリがバックグラウンドにあっても呼ばれるため、
  // ユーザーが通知から直接タイマーを操作できる。
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

  // コンポーネントのアンマウント時などにリスナーを解除し、
  // メモリリークや不要なイベント発火を防ぐ。
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

  // 既存の通知があれば一旦消してから新しい通知を出す。
  // 同じ ID の通知を更新する API が無いため、この方法で擬似更新する。
  if (currentNotificationId) {
    try {
      await Notifications.dismissNotificationAsync(currentNotificationId);
    } catch {}
  }

  // trigger:null を指定して即時表示し、sticky:true で常駐させる。
  // これにより OS がアプリを停止しても通知は残り、操作ボタンも利用できる。
  currentNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: setName,
      body,
      categoryIdentifier: 'TIMER_CONTROLS',
      sound: false,
      android: {
        channelId: 'timer',
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true, // 常駐させる
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

  // 表示中の通知があれば確実に消す。アプリ終了時などに呼び出される。
  if (currentNotificationId) {
    try {
      await Notifications.dismissNotificationAsync(currentNotificationId);
    } catch {}
    currentNotificationId = null;
  }
};

