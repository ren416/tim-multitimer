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
import { Ionicons } from '@expo/vector-icons';

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
  const [quickDigits, setQuickDigits] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
    setQuickDigits('');
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

  const toggleExpanded = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTimePress = () => {
    if (selectedSet) return;
    setQuickDigits('');
    setInputVisible(true);
  };

  const formatQuickDisplay = (d: string) => {
    const padded = d.padStart(4, '-');
    return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
  };

  const handleDigitChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setQuickDigits(digits.slice(-4));
  };

  const confirmQuick = () => {
    const padded = quickDigits.padStart(4, '0');
    const m = parseInt(padded.slice(0, 2), 10);
    const s = parseInt(padded.slice(2, 4), 10);
    const sec = m * 60 + s;
    setRemaining(sec);
    setQuickDigits('');
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
      setQuickDigits('');
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
            <Text style={styles.selectValue}>
              {selectedSet ? selectedSet.name : '"クイックタイマー"'}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.card, { marginTop: 20, alignItems: 'center' }]}>
          <Text style={styles.waitingName}>{selectedSet?.name ?? '"クイックタイマー"'}</Text>
          <Pressable onPress={handleTimePress}>
            <Text style={styles.time}>
              {selectedSet || running || remaining > 0
                ? formatHMS(remaining)
                : formatQuickDisplay(quickDigits)}
            </Text>
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
                <Text style={styles.modalItemText}>"クイックタイマー"</Text>
              </Pressable>
              {state.timerSets.map(s => (
                <View key={s.id} style={styles.modalItem}>
                  <View style={styles.modalItemRow}>
                    <Pressable style={{ flex: 1 }} onPress={() => chooseSet(s.id)}>
                      <Text style={styles.modalItemText}>{s.name}</Text>
                    </Pressable>
                    <Pressable onPress={() => toggleExpanded(s.id)}>
                      <Ionicons
                        name={expanded[s.id] ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={Colors.text}
                      />
                    </Pressable>
                  </View>
                  {expanded[s.id] && (
                    <View style={styles.modalTimers}>
                      {s.timers.map(t => (
                        <Text key={t.id} style={styles.modalTimerText}>
                          {t.label} ({formatHMS(t.durationSec)})
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
              <Pressable
                style={[styles.modalItem, { borderTopWidth: 1, borderTopColor: Colors.border }]}
                onPress={() => setSelectVisible(false)}
              >
                <Text style={[styles.modalItemText, { color: Colors.subText, textAlign: 'center' }]}>キャンセル</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={inputVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>時間を入力</Text>
            <Text style={[styles.time, { textAlign: 'center' }]}>
              {formatQuickDisplay(quickDigits)}
            </Text>
            <TextInput
              value={quickDigits}
              onChangeText={handleDigitChange}
              keyboardType="number-pad"
              style={styles.hiddenInput}
              autoFocus
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
                onPress={() => {
                  setInputVisible(false);
                  setQuickDigits('');
                }}
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
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalItemText: { color: Colors.text, fontWeight: '700', textAlign: 'left' },
  modalTimers: { marginTop: 8, marginLeft: 8 },
  modalTimerText: { color: Colors.subText, fontSize: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12, textAlign: 'center' },
  hiddenInput: { height: 0, width: 0 },
});
