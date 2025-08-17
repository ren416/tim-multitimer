import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
} from 'react-native';
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
  const [selectVisible, setSelectVisible] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputText, setInputText] = useState('');
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

  const handleSelectPress = () => {
    setSelectVisible(true);
  };

  const chooseSet = (id: string) => {
    setSelectedId(id);
    setSelectVisible(false);
  };

  const handleTimePress = () => {
    if (selectedSet) return;
    setInputText('');
    setInputVisible(true);
  };

  const parseTimeInput = (str: string) => {
    const parts = str.split(':').map(p => parseInt(p, 10));
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  };

  const confirmQuick = () => {
    const sec = parseTimeInput(inputText);
    setRemaining(sec);
    setInputVisible(false);
  };

  const start = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (remaining <= 0) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          if (selectedSet) {
            endOne();
          } else {
            setRunning(false);
          }
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
    if (selectedSet) {
      setIndex(0);
      setRemaining(selectedSet?.timers[0]?.durationSec ?? 0);
    } else {
      setRemaining(0);
    }
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
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>タイマーセット選択</Text>
          <Pressable style={styles.select} onPress={handleSelectPress}>
            <Text style={styles.selectLabel}>現在のタイマーセット</Text>
            <Text style={styles.selectValue}>{selectedSet ? selectedSet.name : 'なし'}</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { marginTop: 20, alignItems: 'center' }]}>
          <Text style={styles.cardTitle}>タイマー待機中</Text>
          <Text style={styles.waitingName}>{selectedSet?.name ?? 'クイックタイマー'}</Text>
          <Pressable onPress={handleTimePress}>
            <Text style={styles.time}>{formatHMS(remaining)}</Text>
          </Pressable>
          <View style={styles.row}>
            <IconButton
              label="開始"
              icon="play"
              onPress={start}
              disabled={running || (!selectedSet && remaining <= 0)}
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
      </ScrollView>

      <Modal visible={selectVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Pressable style={styles.modalItem} onPress={() => chooseSet('')}>
                <Text style={styles.modalItemText}>クイックタイマー</Text>
              </Pressable>
              {state.timerSets.map(s => (
                <Pressable
                  key={s.id}
                  style={styles.modalItem}
                  onPress={() => chooseSet(s.id)}
                >
                  <Text style={styles.modalItemText}>{s.name}</Text>
                </Pressable>
              ))}
              <Pressable
                style={[styles.modalItem, { borderTopWidth: 1, borderTopColor: Colors.border }]}
                onPress={() => setSelectVisible(false)}
              >
                <Text style={[styles.modalItemText, { color: Colors.subText }]}>キャンセル</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={inputVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>時間を入力</Text>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="mm:ss"
              keyboardType="numbers-and-punctuation"
              style={styles.input}
            />
            <View style={styles.row}>
              <IconButton
                label="決定"
                icon="checkmark"
                onPress={confirmQuick}
                style={{ flex: 1 }}
              />
              <IconButton
                label="キャンセル"
                icon="close"
                onPress={() => setInputVisible(false)}
                type="secondary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '80%',
  },
  modalItem: { paddingVertical: 12 },
  modalItemText: { color: Colors.text, fontWeight: '700', textAlign: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    textAlign: 'center',
    color: Colors.text,
  },
});
