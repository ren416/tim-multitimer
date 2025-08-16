import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';
import { formatHMS } from '../utils/format';
import IconButton from '../components/IconButton';

export default function HomeScreen() {
  const { state } = useTimerState();
  const [selectedId, setSelectedId] = useState(state.timerSets[0]?.id ?? '');
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number>(
    state.timerSets[0]?.timers[0]?.durationSec ?? 0
  );
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedSet = useMemo(
    () => state.timerSets.find(s => s.id === selectedId) ?? null,
    [selectedId, state.timerSets]
  );

  useEffect(() => {
    // reset when switching sets
    setIndex(0);
    setRemaining(selectedSet?.timers[0]?.durationSec ?? 0);
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [selectedSet]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const cycleSet = () => {
    if (state.timerSets.length === 0) return;
    const idx = state.timerSets.findIndex(s => s.id === selectedId);
    const next = state.timerSets[(idx + 1) % state.timerSets.length];
    setSelectedId(next.id);
  };

  const start = () => {
    if (!selectedSet) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          endOne();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  };

  const reset = () => {
    stop();
    setIndex(0);
    setRemaining(selectedSet?.timers[0]?.durationSec ?? 0);
  };

  const endOne = () => {
    if (!selectedSet) return;
    if (index + 1 < selectedSet.timers.length) {
      const nextIdx = index + 1;
      setIndex(nextIdx);
      setRemaining(selectedSet.timers[nextIdx].durationSec);
      setRunning(false);
      // auto start next timer
      setTimeout(() => start(), 500);
    } else {
      setRunning(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>タイマーセット選択</Text>
          <Pressable style={styles.select} onPress={cycleSet}>
            <Text style={styles.selectLabel}>現在のタイマーセット</Text>
            <Text style={styles.selectValue}>{selectedSet ? selectedSet.name : 'なし'}</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { marginTop: 20, alignItems: 'center' }]}>
          <Text style={styles.cardTitle}>タイマー待機中</Text>
          <Text style={styles.waitingName}>{selectedSet?.name ?? '—'}</Text>
          <Text style={styles.time}>{formatHMS(remaining)}</Text>
          <View style={styles.row}>
            <IconButton
              label="開始"
              icon="play"
              onPress={start}
              disabled={!selectedSet || running}
              style={{ flex: 1 }}
            />
            <IconButton
              label="停止"
              icon="pause"
              onPress={stop}
              disabled={!running}
              type="secondary"
              style={{ flex: 1 }}
            />
            <IconButton
              label="リセット"
              icon="refresh"
              onPress={reset}
              type="secondary"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  select: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  selectLabel: { color: Colors.subText, fontSize: 12 },
  selectValue: { marginTop: 4, color: Colors.text, fontWeight: '700' },
  waitingName: { marginTop: 8, color: Colors.subText },
  time: { fontSize: 48, fontWeight: '800', color: Colors.primaryDark, marginVertical: 12 },
  row: { flexDirection: 'row', gap: 12 },
});
