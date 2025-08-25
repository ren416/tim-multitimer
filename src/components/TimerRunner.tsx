import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Timer, TimerSet } from '../context/TimerContext';
import { Colors } from '../constants/colors';
import { formatHMS } from '../utils/format';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { useTimerState } from '../context/TimerContext';
import { SOUND_FILES } from '../constants/sounds';

type Props = {
  timerSet: TimerSet;
  onFinish?: () => void;
  onCancel?: () => void;
};

export default function TimerRunner({ timerSet, onFinish, onCancel }: Props) {
  const { state, dispatch } = useTimerState();
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const getDuration = (t?: Timer) => {
    const d = Number(t?.durationSec);
    return Number.isFinite(d) ? Math.max(0, d) : 0;
  };

  const [remaining, setRemaining] = useState(() => getDuration(timerSet.timers[0]));
  const [running, setRunning] = useState(false);
  const [startedHistoryId, setStartedHistoryId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const notifySoundRef = useRef<Audio.Sound | null>(null);

  const totalCount = timerSet.timers.length;
  const current = timerSet.timers[index];

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    if (!startedHistoryId) {
      dispatch({ type: 'LOG_START', payload: { timerSetId: timerSet.id } });
      setStartedHistoryId('temp'); // just a flag; reducer generates id but we don't need it for now
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const loadSound = async () => {
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

  const unloadSound = async () => {
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

  const scheduleEndNotification = async (
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
          sound: withSound,
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

  const start = () => {
    const curr = timerSet.timers[indexRef.current];
    if (!curr) return;
    const duration = getDuration(curr);
    const isLast = indexRef.current + 1 >= totalCount;
    setRemaining(duration);
    setRunning(true);
    try { soundRef.current?.stopAsync(); } catch {}
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          endOne();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    if (
      state.settings.enableNotifications &&
      timerSet.notifications?.enabled &&
      curr?.notify !== false
    ) {
      scheduleEndNotification(duration, curr, isLast);
    }
  };

  const pause = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const resetCurrent = () => {
    if (!current) return;
    setRemaining(getDuration(current));
  };

  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  });

  const endOne = async () => {
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
      // auto start next without flashing button
      startRef.current();
    } else {
      setRunning(false);
      onFinish?.();
    }
  };

  const skip = () => {
    const currentIdx = indexRef.current;
    if (currentIdx + 1 < totalCount) {
      const next = currentIdx + 1;
      setIndex(next);
      indexRef.current = next;
      setRemaining(getDuration(timerSet.timers[next]));
    } else {
      onFinish?.();
    }
  };

  const cancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    try { soundRef.current?.stopAsync(); } catch {}
    try { notifySoundRef.current?.stopAsync(); } catch {}
    onCancel?.();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{timerSet.name}</Text>
      <Text style={styles.currentLabel}>{current?.label ?? '—'}</Text>
      <Text style={styles.time}>{formatHMS(remaining)}</Text>

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

      <Text style={styles.progress}>{index + 1} / {totalCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 20 },
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
