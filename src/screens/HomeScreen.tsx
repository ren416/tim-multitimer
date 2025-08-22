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
import { uuidv4 } from '../utils/uuid';
import IconButton from '../components/IconButton';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';

export default function HomeScreen() {
  const { state, dispatch } = useTimerState();
  const [selectedId, setSelectedId] = useState(state.timerSets[0]?.id ?? '');
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [remaining, setRemaining] = useState<number>(
    state.timerSets[0]?.timers[0]?.durationSec ?? 0
  );
  const [running, setRunning] = useState(false);
  const [selectVisible, setSelectVisible] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [quickDigits, setQuickDigits] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [runCount, setRunCount] = useState(0);
  const [totalSec, setTotalSec] = useState(0);
  const historyRef = useRef({ id: historyId, total: totalSec, run: runCount });
  const [modeIndex, setModeIndex] = useState(0);
  const [quickInitial, setQuickInitial] = useState(0);
  const [progress, setProgress] = useState(0);

  const elapsedRef = useRef(0);
  const lastUpdateRef = useRef(Date.now());
  const selectedSet = useMemo(
    () => state.timerSets.find(s => s.id === selectedId) ?? null,
    [selectedId, state.timerSets]
  );

  const modes: Array<'simple' | 'bar' | 'circle'> = ['simple', 'bar', 'circle'];
  const scrollRef = useRef<ScrollView>(null);
  const handlePageScroll = (e: any) => {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    const idx = Math.round(contentOffset.x / layoutMeasurement.width);
    if (idx !== modeIndex) setModeIndex(idx);
  };

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    historyRef.current = { id: historyId, total: totalSec, run: runCount };
  }, [historyId, totalSec, runCount]);

  const totalDuration = useMemo(() => {
    if (selectedSet) {
      return selectedSet.timers.reduce((sum, t) => sum + t.durationSec, 0);
    }
    return quickInitial;
  }, [selectedSet, quickInitial]);

  const elapsed = useMemo(() => {
    if (selectedSet) {
      const past = selectedSet.timers
        .slice(0, index)
        .reduce((sum, t) => sum + t.durationSec, 0);
      const current = selectedSet.timers[index]?.durationSec ?? 0;
      return past + (current - remaining);
    }
    return quickInitial - remaining;
  }, [selectedSet, index, remaining, quickInitial]);


  const markers = useMemo(() => {
    if (!selectedSet) return [] as number[];
    const total = selectedSet.timers.reduce((sum, t) => sum + t.durationSec, 0);
    let cum = 0;
    return selectedSet.timers.map(t => {
      cum += t.durationSec;
      return cum / total;
    });
  }, [selectedSet]);

  const clampProgress = (p: number) => {
    if (!isFinite(p)) return 0;
    if (p < 0) return 0;
    if (p > 1) return 1;
    return p;
  };

  useEffect(() => {
    elapsedRef.current = elapsed;
    lastUpdateRef.current = Date.now();
    setProgress(totalDuration > 0 ? clampProgress(elapsed / totalDuration) : 0);
  }, [elapsed, totalDuration]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const diff = (Date.now() - lastUpdateRef.current) / 1000;
      const estElapsed = elapsedRef.current + diff;
      const p = totalDuration > 0 ? estElapsed / totalDuration : 0;
      setProgress(clampProgress(p));
      if (running) raf = requestAnimationFrame(tick);
    };
    if (running) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, totalDuration]);

  const renderTimeDisplay = (mode: 'simple' | 'bar' | 'circle') => {
    const timeText = (
      <Text style={styles.time}>
        {selectedSet || running || remaining > 0
          ? formatHMS(remaining)
          : formatQuickDisplay(quickDigits)}
      </Text>
    );

    if (mode === 'bar') {
      return (
        <View style={styles.displayFrame}>
          {timeText}
          <View style={styles.barTrack}>
            <View style={[styles.barProgress, { width: `${progress * 100}%` }]} />
            {markers.map((m, idx) => (
              <View key={idx} style={[styles.barMarker, { left: `${m * 100}%` }]} />
            ))}
          </View>
        </View>
      );
    }

    if (mode === 'circle') {
      const size = 200;
      const stroke = 8;
      const radius = (size - stroke) / 2;
      const circumference = 2 * Math.PI * radius;
      return (
        <View style={styles.displayFrame}>
          <View style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
              <G rotation="-90" origin={`${size / 2},${size / 2}`}>
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={Colors.border}
                  strokeWidth={stroke}
                  fill="none"
                />
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={Colors.primary}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={(1 - progress) * circumference}
                />
                {markers.map((m, idx) => {
                  const angle = 2 * Math.PI * m;
                  const x = size / 2 + radius * Math.cos(angle);
                  const y = size / 2 + radius * Math.sin(angle);
                  return <Circle key={idx} cx={x} cy={y} r={4} fill={Colors.primaryDark} />;
                })}
              </G>
            </Svg>
            <View style={styles.circleCenter}>{timeText}</View>
          </View>
        </View>
      );
    }

    return <View style={styles.displayFrame}>{timeText}</View>;
  };

  useEffect(() => {
    // reset when switching sets
    setIndex(0);
    setRemaining(selectedSet?.timers[0]?.durationSec ?? 0);
    setRunning(false);
    setQuickDigits('');
    setQuickInitial(0);
    setHistoryId(null);
    setRunCount(0);
    setTotalSec(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [selectedSet]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const { id, total, run } = historyRef.current;
      if (id) {
        dispatch({
          type: 'LOG_COMPLETE',
          payload: { id, cancelled: true, totalDurationSec: total, timersRun: run },
        });
      }
    };
  }, [dispatch]);

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
    if (!d) return '00:00';
    const s = d.slice(-2).padStart(2, '0');
    const m = d.slice(0, -2) || '0';
    return `${m}:${s}`;
  };

  const handleDigitChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setQuickDigits(digits.slice(-6));
  };

  const confirmQuick = () => {
    const digits = quickDigits || '0';
    const m = parseInt(digits.slice(0, -2) || '0', 10);
    const s = parseInt(digits.slice(-2) || '0', 10);
    const sec = m * 60 + s;
    setRemaining(sec);
    setQuickInitial(sec);
    setQuickDigits('');
    setInputVisible(false);
  };

  const start = (init?: number) => {
    if (selectedSet && !historyId) {
      const id = uuidv4();
      dispatch({ type: 'LOG_START', payload: { id, timerSetId: selectedSet.id } });
      setHistoryId(id);
      setRunCount(0);
      setTotalSec(0);
    }
    const rem = init ?? remaining;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (rem <= 0) return;
    elapsedRef.current = elapsed;
    lastUpdateRef.current = Date.now();
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  };

  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  });

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  };

  const reset = () => {
    stop();
    if (historyId) {
      dispatch({
        type: 'LOG_COMPLETE',
        payload: {
          id: historyId,
          cancelled: true,
          totalDurationSec: totalSec,
          timersRun: runCount,
        },
      });
      setHistoryId(null);
      setRunCount(0);
      setTotalSec(0);
    }
    if (selectedSet) {
      setIndex(0);
      setRemaining(selectedSet?.timers[0]?.durationSec ?? 0);
    } else {
      setRemaining(0);
      setQuickDigits('');
      setQuickInitial(0);
    }
  };

  const endOne = () => {
    if (!selectedSet) return;
    const currentIdx = indexRef.current;
    const duration = selectedSet.timers[currentIdx].durationSec;
    const newRun = runCount + 1;
    const newTotal = totalSec + duration;
    setRunCount(newRun);
    setTotalSec(newTotal);
    if (currentIdx + 1 < selectedSet.timers.length) {
      const nextIdx = currentIdx + 1;
      const nextDur = selectedSet.timers[nextIdx].durationSec;
      setIndex(nextIdx);
      indexRef.current = nextIdx;
      setRemaining(nextDur);
      elapsedRef.current = elapsed;
      lastUpdateRef.current = Date.now();
      startRef.current(nextDur);
    } else {
      setRunning(false);
      if (historyId) {
        dispatch({
          type: 'LOG_COMPLETE',
          payload: { id: historyId, totalDurationSec: newTotal, timersRun: newRun },
        });
        setHistoryId(null);
        setRunCount(0);
        setTotalSec(0);
      }
    }
  };

  useEffect(() => {
    if (remaining === 0 && running) {
      if (selectedSet) {
        endOne();
      } else {
        setRunning(false);
      }
    }
  }, [remaining, running, selectedSet]);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>タイマーセット選択</Text>
          <Pressable style={styles.select} onPress={handleSelectPress}>
            <Text style={styles.selectLabel}>現在のタイマーセット</Text>
            <Text style={styles.selectValue}>
              {selectedSet ? selectedSet.name : '"クイックタイマー"'}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.timerCard]}>
          {selectedSet ? (
            <>
              <Text style={styles.infoText}>{`タイマーセット名：${selectedSet.name}`}</Text>
              <Text style={styles.infoText}>{`今の時間：${selectedSet.timers[index]?.label ?? ''}`}</Text>
            </>
          ) : (
            <Text style={styles.waitingName}>"クイックタイマー"</Text>
          )}
          <View style={styles.displayPager}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handlePageScroll}
              style={{ width: 240 }}
            >
              {modes.map(m => (
                <Pressable key={m} onPress={handleTimePress}>
                  {renderTimeDisplay(m)}
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.pageControl}>
              {modes.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, idx === modeIndex && styles.activeDot]}
                />
              ))}
            </View>
          </View>
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
  content: { flexGrow: 1, padding: 16 },
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
  infoText: { marginTop: 8, color: Colors.text },
  time: { fontSize: 48, fontWeight: '800', color: Colors.primaryDark, marginVertical: 12 },
  row: { flexDirection: 'row', gap: 12 },
  displayPager: { alignItems: 'center', flex: 1 },
  pageControl: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  activeDot: { backgroundColor: Colors.primary },
  displayFrame: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    padding: 12,
  },
  barTrack: {
    position: 'relative',
    width: '80%',
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    marginTop: 20,
  },
  barProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  barMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 10,
    backgroundColor: Colors.primaryDark,
    transform: [{ translateX: -1 }],
  },
  circleCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  timerCard: { marginTop: 20, alignItems: 'center', flex: 1 },
});
