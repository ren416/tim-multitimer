import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, AppState } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Timer, TimerSet } from '../context/TimerContext';
import { Colors } from '../constants/colors';
import { formatHMS } from '../utils/format';
import { Audio } from 'expo-av';
import { useTimerState } from '../context/TimerContext';
import { SOUND_FILES } from '../constants/sounds';
import { scheduleEndNotification } from '../utils/notifications';
import { usePipMode, usePipTimerControls } from '../utils/pip';

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

  const totalCount = timerSet.timers.length; // タイマーの総数
  const current = timerSet.timers[index];    // 現在のタイマー
  const { enterPip } = usePipMode();

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // state の残り秒数が変化したら参照値も更新
  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  // タイマーセットが切り替わったら状態を初期化
  useEffect(() => {
    setIndex(0);
    indexRef.current = 0;
    const d = getDuration(timerSet.timers[0]);
    setRemaining(d);
    remainingRef.current = d;
    endAtRef.current = null;
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

  // 1秒ごとに残り時間を計算し更新するインターバルをセットアップ
  const setupInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (endAtRef.current == null) return;
      const remain = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      remainingRef.current = remain;
      setRemaining(remain);
      if (remain <= 0) {
        clearInterval(intervalRef.current!);
        endOne();
      }
    }, 1000);
  };

  // バックグラウンドから復帰した際に残り時間を補正
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && running && endAtRef.current != null) {
        const remain = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
        remainingRef.current = remain;
        setRemaining(remain);
        setupInterval();
        if (remain <= 0) {
          clearInterval(intervalRef.current!);
          endOne();
        }
      }
    });
    return () => sub.remove();
  }, [running]);

  /**
   * 現在のタイマーを開始し1秒ごとのカウントダウンをセットする。
   * 通知設定が有効なら終了通知も予約する。
   */
  const start = () => {
    const curr = timerSet.timers[indexRef.current];
    if (!curr) return;
    const duration = getDuration(curr);
    const isLast = indexRef.current + 1 >= totalCount;
    setRunning(true);
    remainingRef.current = duration;
    setRemaining(duration);
    endAtRef.current = Date.now() + duration * 1000;
    try { soundRef.current?.stopAsync(); } catch {}
    setupInterval();
    if (
      state.settings.enableNotifications &&
      timerSet.notifications?.enabled &&
      curr?.notify !== false
    ) {
      scheduleEndNotification(duration, curr, isLast);
    }
  };

  /**
   * カウントダウンを一時停止する。再開時は start() を呼び出す。
   */
  const pause = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (remainingRef.current) {
      endAtRef.current = Date.now() + remainingRef.current * 1000;
    }
  };

  /**
   * 現在のタイマーを初期残り時間にリセットする。
   */
  const resetCurrent = () => {
    if (!current) return;
    const d = getDuration(current);
    remainingRef.current = d;
    setRemaining(d);
    endAtRef.current = running ? Date.now() + d * 1000 : null;
    if (running) setupInterval();
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
      endAtRef.current = running ? Date.now() + d * 1000 : null;
      if (running) setupInterval();
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
    try { soundRef.current?.stopAsync(); } catch {}
    try { notifySoundRef.current?.stopAsync(); } catch {}
    onCancel?.();
  };

  // Enable PiP controls when app goes to background
  usePipTimerControls({
    start,
    stop: pause,
    reset: resetCurrent,
    selectType: skip,
  });

  return (
    <View style={styles.container}>
      <Pressable onPress={enterPip} style={styles.pipBtn}>
        <MaterialIcons
          name="picture-in-picture-alt"
          size={24}
          color={Colors.text}
        />
      </Pressable>
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
  pipBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
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
