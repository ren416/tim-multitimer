import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';
import TimerRunner from '../components/TimerRunner';

export default function HomeScreen() {
  const { state } = useTimerState();
  const [selectedId, setSelectedId] = useState(state.timerSets[0]?.id ?? '');
  const [runningId, setRunningId] = useState<string | null>(null);

  const selectedSet = useMemo(
    () => state.timerSets.find(s => s.id === selectedId) ?? null,
    [selectedId, state.timerSets]
  );

  const runningSet = useMemo(
    () => state.timerSets.find(s => s.id === runningId) ?? null,
    [runningId, state.timerSets]
  );

  const cycleSet = () => {
    if (state.timerSets.length === 0) return;
    const idx = state.timerSets.findIndex(s => s.id === selectedId);
    const next = state.timerSets[(idx + 1) % state.timerSets.length];
    setSelectedId(next.id);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {runningSet ? (
        <TimerRunner timerSet={runningSet} onFinish={() => setRunningId(null)} onCancel={() => setRunningId(null)} />
      ) : (
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
            <Text style={styles.time}>00:00</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.btn, styles.primary]}
                onPress={() => setRunningId(selectedId)}
                disabled={!selectedSet}
              >
                <Text style={styles.btnText}>開始</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.secondary]}>
                <Text style={styles.btnText}>停止</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.secondary]}>
                <Text style={styles.btnText}>リセット</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
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
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  btnText: { fontWeight: '700', color: '#0B1D2A' },
});
