import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, AppState } from 'react-native';
import { Timer, TimerSet } from '../context/TimerContext';
import { Colors } from '../constants/colors';
import { formatHMS } from '../utils/format';
import { Audio } from 'expo-av';
import { useTimerState } from '../context/TimerContext';
import { SOUND_FILES } from '../constants/sounds';
import { scheduleEndNotification, cancelTimerSetNotification } from '../utils/notifications';
import {
  initTimerNotification,
  registerTimerActionHandler,
  unregisterTimerActionHandler,
  updateTimerNotification,
  clearTimerNotification,
} from '../utils/timerNotification';

// 複数のタイマーを連続で実行するランナーコンポーネント。
// カウントダウン処理や音声再生、通知のスケジュールなどを管理する。

type Props = {
  timerSet: TimerSet;
  onFinish?: () => void;
  onCancel?: () => void;
};

export default function TimerRunner({ timerSet, onFinish, onCancel }: Props) {
  const { state, dispatch } = useTimerState();
  const [index, setIndex] = useState(0); // 現在実行中のタイマーのインデックス
  const indexRef = useRef(0);            // setInterval 内から参照するためのインデックスの参照
  /**
   * Timer オブジェクトから持続時間（秒）を安全に取得する。
   * @param t 対象のタイマー。undefined でもよい。
   * @returns 有効な秒数。無効な値は0として返す。
   */
  const getDuration = (t?: Timer): number => {
    const d = Number(t?.durationSec);
    return Number.isFinite(d) ? Math.max(0, d) : 0;
  };

  // 残り時間や実行状態などのステート群
  const [remaining, setRemaining] = useState(() => getDuration(timerSet.timers[0]));
  const [running, setRunning] = useState(false);
  const [startedHistoryId, setStartedHistoryId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endAtRef = useRef<number | null>(null);        // 現在のタイマーの終了予定時刻
  const remainingRef = useRef(remaining);              // 最新の残り秒数を保持
  const soundRef = useRef<Audio.Sound | null>(null);      // 終了時に鳴らすサウンド
  const notifySoundRef = useRef<Audio.Sound | null>(null); // 区切りの通知音
  const scheduledIdsRef = useRef<string[]>([]);             // 予約した通知IDの保持
  const totalSetMsRef = useRef(0);                          // タイマーセット全体の総時間(ms)
  const setEndAtRef = useRef<number | null>(null);          // タイマーセット全体の終了予定時刻

  const totalCount = timerSet.timers.length; // タイマーの総数
  const current = timerSet.timers[index];    // 現在のタイマー

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // state の残り秒数が変化したら参照値も更新
  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  // タイマーセット全体の総時間を計算して保持
  useEffect(() => {
    totalSetMsRef.current = timerSet.timers.reduce(
      (sum, t) => sum + getDuration(t) * 1000,
      0
    );
  }, [timerSet]);

  // タイマーセットが切り替わったら状態を初期化
  useEffect(() => {
    setIndex(0);
    indexRef.current = 0;
    const d = getDuration(timerSet.timers[0]);
    setRemaining(d);
    remainingRef.current = d;
    endAtRef.current = null;
    setEndAtRef.current = null;
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [timerSet.id]);

  // マウント時に実行開始を履歴へ記録
  useEffect(() => {
    if (!startedHistoryId) {
      dispatch({ type: 'LOG_START', payload: { timerSetId: timerSet.id } });
      setStartedHistoryId('temp'); // reducer が ID を生成するため、ここでは仮のフラグを設定
    }
  }, []);

  // コンポーネントアンマウント時に interval をクリア
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /**
   * サウンドファイルを読み込み、通知音量に応じて設定する。
   * 既存のサウンドは解放してから新たに読み込む。
   */
  const loadSound = async (): Promise<void> => {
    try {
      await soundRef.current?.unloadAsync();
      const name = timerSet.sound || 'normal';
      if (name === 'none') {
        soundRef.current = null;
      } else {
        const file = SOUND_FILES[name] || SOUND_FILES['normal'];
        const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: false });
        await sound.setVolumeAsync(state.settings.notificationVolume ?? 1);
        soundRef.current = sound;
      }
      await notifySoundRef.current?.unloadAsync();
      const { sound: nSound } = await Audio.Sound.createAsync(
        SOUND_FILES['beep'],
        { shouldPlay: false }
      );
      await nSound.setVolumeAsync(state.settings.notificationVolume ?? 1);
      notifySoundRef.current = nSound;
    } catch(e) {
      console.warn('Failed to load sound', e);
    }
  };

  /**
   * 読み込んだサウンドを解放してメモリ使用量を抑える。
   */
  const unloadSound = async (): Promise<void> => {
    try { await soundRef.current?.unloadAsync(); } catch {}
    try { await notifySoundRef.current?.unloadAsync(); } catch {}
  };

  useEffect(() => {
    loadSound();
    return () => {
      unloadSound();
    };
  }, [timerSet.sound]);

  useEffect(() => {
    soundRef.current?.setVolumeAsync(state.settings.notificationVolume ?? 1);
    notifySoundRef.current?.setVolumeAsync(state.settings.notificationVolume ?? 1);
  }, [state.settings.notificationVolume]);

  /**
   * タイマーセット全体の残り時間(ms)を計算する。
   */
  const calcRemainingSetMs = (): number => {
    let total = remainingRef.current * 1000;
    for (let i = indexRef.current + 1; i < totalCount; i++) {
      total += getDuration(timerSet.timers[i]) * 1000;
    }
    return total;
  };

  // 1秒ごとに残り時間を計算し更新するインターバルをセットアップ。
  // JS の setInterval はバックグラウンドで止まるため、実際の終了時刻(endAtRef)
  // との差から残り時間を算出し続ける。通知も毎秒更新してユーザーに進捗を提示する。
  const setupInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (endAtRef.current == null) return;
      const remain = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      remainingRef.current = remain;
      setRemaining(remain);
      const currTimer = timerSet.timers[indexRef.current];
      updateTimerNotification(timerSet.name, currTimer?.label ?? '', remain);
      if (remain <= 0) {
        clearInterval(intervalRef.current!);
        endOne();
      }
    }, 1000);
  };

  // バックグラウンドから復帰した際に経過時間を補正する。
  // JS のインターバルは停止しているため、記録しておいた終了予定時刻から
  // 実際にどれだけ時間が経過したかを計算し直す必要がある。
  const handleAppActive = (): void => {
    if (!running || setEndAtRef.current == null) return;
    const now = Date.now();
    // セット全体の終了予定時刻から現在時刻を差し引き、残りミリ秒を計算
    const totalRemainMs = setEndAtRef.current - now;

    if (totalRemainMs <= 0) {
      // セット全体が終了している場合
      setIndex(totalCount - 1);
      indexRef.current = totalCount - 1;
      setRunning(false);
      remainingRef.current = 0;
      setRemaining(0);
      endAtRef.current = null;
      setEndAtRef.current = null;
      clearTimerNotification();
      cancelTimerSetNotification(scheduledIdsRef.current);
      scheduledIdsRef.current = [];
      onFinish?.();
      return;
    }

    const elapsedMs = totalSetMsRef.current - totalRemainMs;
    let elapsed = elapsedMs;
    let idx = 0;
    while (idx < totalCount) {
      const dMs = getDuration(timerSet.timers[idx]) * 1000;
      if (elapsed < dMs) break;
      elapsed -= dMs;
      idx++;
    }
    if (idx >= totalCount) {
      // 念のため全終了扱い
      setIndex(totalCount - 1);
      indexRef.current = totalCount - 1;
      setRunning(false);
      remainingRef.current = 0;
      setRemaining(0);
      endAtRef.current = null;
      setEndAtRef.current = null;
      clearTimerNotification();
      cancelTimerSetNotification(scheduledIdsRef.current);
      scheduledIdsRef.current = [];
      onFinish?.();
      return;
    }

    setIndex(idx);
    indexRef.current = idx;
    const currDurationMs = getDuration(timerSet.timers[idx]) * 1000;
    const remainMs = currDurationMs - elapsed;
    const remainSec = Math.max(0, Math.round(remainMs / 1000));
    remainingRef.current = remainSec;
    setRemaining(remainSec);
    endAtRef.current = now + remainMs;
    setEndAtRef.current = now + totalRemainMs;
    setupInterval();
    updateTimerNotification(timerSet.name, timerSet.timers[idx]?.label ?? '', remainSec);
  };

  useEffect(() => {
    // アプリがバックグラウンドからアクティブに戻ったタイミングで
    // 時刻のズレを補正するため、AppState の変更を監視する。
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        handleAppActive();
      }
    });
    return () => sub.remove();
  }, [running, timerSet]);

  /**
   * 各タイマー終了通知をまとめてスケジュールする。
   * アプリがバックグラウンドに入って JS タイマーが止まっても、
   * OS からの通知で終了を知らせられるよう、開始時に全て予約しておく。
   * セット開始時に一度だけ呼び出す。
   */
  const scheduleAllNotifications = async (): Promise<void> => {
    if (!state.settings.enableNotifications) {
      return;
    }
    let total = 0;
    const ids: string[] = [];
    for (let i = 0; i < timerSet.timers.length; i++) {
      const t = timerSet.timers[i];
      const d = getDuration(t);
      total += d;
      if (t?.notify === false) continue; // 通知を無効化しているタイマーはスキップ
      const isLast = i === timerSet.timers.length - 1;
      const id = await scheduleEndNotification(total, t, isLast);
      if (id) ids.push(id); // 後でキャンセルできるよう ID を保存
    }
    scheduledIdsRef.current = ids;
  };

  /**
   * 現在のタイマーを開始し1秒ごとのカウントダウンをセットする。
   * endAtRef / setEndAtRef に「終了予定時刻」を記録しておき、
   * バックグラウンド中でも正確な残り時間を算出できるようにする。
   */
  const start = () => {
    const curr = timerSet.timers[indexRef.current];
    if (!curr) return;
    const duration = getDuration(curr);
    setRunning(true);
    remainingRef.current = duration;
    setRemaining(duration);
    endAtRef.current = Date.now() + duration * 1000; // 現在タイマーの終了時刻
    setEndAtRef.current = Date.now() + calcRemainingSetMs(); // セット全体の終了時刻
    try { soundRef.current?.stopAsync(); } catch {}
    setupInterval();
    updateTimerNotification(timerSet.name, curr.label ?? '', duration);
    if (indexRef.current === 0 && scheduledIdsRef.current.length === 0) {
      // セット開始時に全通知を予約
      scheduleAllNotifications();
    }
  };

  /**
   * カウントダウンを一時停止する。再開時は start() を呼び出す。
   * 停止した時点の残り時間から終了予定時刻を再計算して保持する。
   */
  const pause = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (remainingRef.current) {
      endAtRef.current = Date.now() + remainingRef.current * 1000;
    }
    setEndAtRef.current = Date.now() + calcRemainingSetMs();
    updateTimerNotification(timerSet.name, current?.label ?? '', remainingRef.current);
  };

  /**
   * 現在のタイマーを初期残り時間にリセットする。
   * running 中かどうかで終了予定時刻を再設定し、通知も更新する。
   */
  const resetCurrent = () => {
    if (!current) return;
    const d = getDuration(current);
    remainingRef.current = d;
    setRemaining(d);
    endAtRef.current = running ? Date.now() + d * 1000 : null;
    if (running) {
      setEndAtRef.current = Date.now() + calcRemainingSetMs();
      setupInterval();
    } else {
      setEndAtRef.current = null;
    }
    updateTimerNotification(timerSet.name, current.label ?? '', d);
  };

  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  });

  /**
   * 1つのタイマーが終了した際の後処理を行う。
   * 次のタイマーがあれば自動的に開始し、なければ完了コールバックを呼ぶ。
   */
  const endOne = async (): Promise<void> => {
    const currentIdx = indexRef.current;
    const curr = timerSet.timers[currentIdx];
    const isLast = currentIdx + 1 >= totalCount;
    if (curr?.notify !== false) {
      if (!isLast) {
        try {
          await notifySoundRef.current?.replayAsync();
        } catch {}
      } else {
        try {
          await soundRef.current?.replayAsync();
        } catch {}
      }
    } else if (isLast) {
      try { await soundRef.current?.replayAsync(); } catch {}
    }
    if (currentIdx + 1 < totalCount) {
      const next = currentIdx + 1;
      setIndex(next);
      indexRef.current = next;
      setRemaining(getDuration(timerSet.timers[next]));
      // ボタンの点滅を避けるため、次のタイマーを自動開始
      startRef.current();
    } else {
      setRunning(false);
      setEndAtRef.current = null;
      clearTimerNotification();
      cancelTimerSetNotification(scheduledIdsRef.current);
      scheduledIdsRef.current = [];
      onFinish?.();
    }
  };

  /**
   * 現在のタイマーを強制的に終了し、次のタイマーに進む。
   */
  const skip = () => {
    const currentIdx = indexRef.current;
    if (currentIdx + 1 < totalCount) {
      const next = currentIdx + 1;
      setIndex(next);
      indexRef.current = next;
      const d = getDuration(timerSet.timers[next]);
      remainingRef.current = d;
      setRemaining(d);
      // スキップ後もバックグラウンド補正が効くように終了予定時刻を再計算
      endAtRef.current = running ? Date.now() + d * 1000 : null;
      if (running) {
        setEndAtRef.current = Date.now() + calcRemainingSetMs();
        setupInterval();
      } else {
        setEndAtRef.current = null;
      }
      const nextTimer = timerSet.timers[next];
      updateTimerNotification(timerSet.name, nextTimer.label ?? '', d);
    } else {
      onFinish?.();
    }
  };

  /**
   * すべてのカウントダウンとサウンドを停止し、キャンセルコールバックを呼ぶ。
   */
  const cancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    endAtRef.current = null;
    setEndAtRef.current = null;
    try { soundRef.current?.stopAsync(); } catch {}
    try { notifySoundRef.current?.stopAsync(); } catch {}
    // 常駐通知および事前に予約した終了通知を全てクリア
    clearTimerNotification();
    cancelTimerSetNotification(scheduledIdsRef.current);
    scheduledIdsRef.current = [];
    onCancel?.();
  };

  // Setup notification channel/category and handle actions
  useEffect(() => {
    // 初回マウント時に通知チャンネル/カテゴリを作成し、
    // 通知からの操作を受け取れるようハンドラを登録する。
    initTimerNotification();
    registerTimerActionHandler({
      onStart: () => startRef.current(),
      onPause: pause,
      onReset: resetCurrent,
    });
    return () => {
      // アンマウント時にはリスナーと通知を確実に解放してリークを防ぐ。
      unregisterTimerActionHandler();
      clearTimerNotification();
      cancelTimerSetNotification(scheduledIdsRef.current);
      scheduledIdsRef.current = [];
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* セット名と現在のタイマー情報 */}
      <Text style={styles.name}>{timerSet.name}</Text>
      <Text style={styles.currentLabel}>{current?.label ?? '—'}</Text>
      <Text style={styles.time}>{formatHMS(remaining)}</Text>

      {/* 操作用のボタン類 */}
      <View style={styles.controls}>
        {!running ? (
          <Pressable onPress={start} style={[styles.btn, styles.primary]}>
            <Text style={styles.btnText}>開始</Text>
          </Pressable>
        ) : (
          <Pressable onPress={pause} style={[styles.btn, styles.secondary]}>
            <Text style={styles.btnText}>一時停止</Text>
          </Pressable>
        )}
        <Pressable onPress={skip} style={[styles.btn, styles.secondary]}>
          <Text style={styles.btnText}>スキップ</Text>
        </Pressable>
        <Pressable onPress={cancel} style={[styles.btn, styles.danger]}>
          <Text style={styles.btnText}>中止</Text>
        </Pressable>
      </View>

      {/* 進捗を表示 */}
      <Text style={styles.progress}>{index + 1} / {totalCount}</Text>
    </View>
  );
}

// このコンポーネントで利用するスタイル定義
const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 20, width: '100%', position: 'relative' },
  name: { fontSize: 20, fontWeight: '700', color: Colors.text },
  currentLabel: { marginTop: 12, fontSize: 16, color: Colors.subText },
  time: { fontSize: 72, fontWeight: '800', color: Colors.primaryDark, marginVertical: 20 },
  controls: { flexDirection: 'row', gap: 12 },
  btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  danger: { backgroundColor: Colors.danger },
  btnText: { color: '#0B1D2A', fontWeight: '700' },
  progress: { marginTop: 10, color: Colors.subText }
});

