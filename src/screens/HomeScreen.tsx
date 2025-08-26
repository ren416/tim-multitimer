import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState, Timer } from '../context/TimerContext';
import { formatHMS } from '../utils/format';
import { uuidv4 } from '../utils/uuid';
import IconButton from '../components/IconButton';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { SOUND_OPTIONS, SOUND_FILES } from '../constants/sounds';
import { Audio } from 'expo-av';

export default function HomeScreen() {
  const { state, dispatch } = useTimerState();
  const getDuration = (t?: Timer) => {
    const d = Number(t?.durationSec);
    return Number.isFinite(d) ? Math.max(0, d) : 0;
  };
  const [selectedId, setSelectedId] = useState<string | null>(
    state.timerSets[0]?.id ?? null
  );
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [remaining, setRemaining] = useState<number>(
    getDuration(state.timerSets[0]?.timers[0])
  );
  const [running, setRunning] = useState(false);
  const runningRef = useRef(running);
  const [selectVisible, setSelectVisible] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [quickDigits, setQuickDigits] = useState('');
  const [quickSound, setQuickSound] = useState('normal');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const nextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [runCount, setRunCount] = useState(0);
  const [totalSec, setTotalSec] = useState(0);
  const historyRef = useRef({ id: historyId, total: totalSec, run: runCount });
  const [modeIndex, setModeIndex] = useState(0);
  const [quickInitial, setQuickInitial] = useState(0);
  const [progress, setProgress] = useState(0);
  const [soundSelectVisible, setSoundSelectVisible] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const notifySoundRef = useRef<Audio.Sound | null>(null);
  const [soundPlaying, setSoundPlaying] = useState(false);

  const elapsedRef = useRef(0);
  const lastUpdateRef = useRef(Date.now());
  const selectedSet = useMemo(
    () => state.timerSets.find(s => s.id === selectedId) ?? null,
    [selectedId, state.timerSets]
  );

  // Ensure a timer set is selected once data is loaded
  useEffect(() => {
    if (selectedId === null && state.timerSets.length > 0) {
      setSelectedId(state.timerSets[0].id);
    }
  }, [selectedId, state.timerSets]);

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
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    historyRef.current = { id: historyId, total: totalSec, run: runCount };
  }, [historyId, totalSec, runCount]);

  const totalDuration = useMemo(() => {
    if (selectedSet) {
      return selectedSet.timers.reduce((sum, t) => sum + getDuration(t), 0);
    }
    return quickInitial;
  }, [selectedSet, quickInitial]);

  const elapsed = useMemo(() => {
    if (selectedSet) {
      const past = selectedSet.timers
        .slice(0, index)
                .reduce((sum, t) => sum + getDuration(t), 0);
      const current = getDuration(selectedSet.timers[index]);
      return past + (current - remaining);
    }
    return quickInitial - remaining;
  }, [selectedSet, index, remaining, quickInitial]);


  const markers = useMemo(() => {
    if (!selectedSet) return [] as number[];
    const total = selectedSet.timers.reduce((sum, t) => sum + getDuration(t), 0);
    if (total <= 0) return [] as number[];
    let cum = 0;
    return selectedSet.timers.map(t => {
      cum += getDuration(t);
      return cum / total;
    });
  }, [selectedSet]);

  const clampProgress = (p: number) => {
    if (!isFinite(p)) return 0;
    if (p < 0) return 0;
    if (p > 1) return 1;
    return p;
  };

  const loadSound = async (s: string) => {
    try {
      await soundRef.current?.unloadAsync();
      await notifySoundRef.current?.unloadAsync();
      setSoundPlaying(false);
      if (s === 'none') {
        soundRef.current = null;
      } else {
        const file = SOUND_FILES[s] || SOUND_FILES['normal'];
        const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: false });
        await sound.setVolumeAsync(state.settings.notificationVolume ?? 1);
        sound.setOnPlaybackStatusUpdate(status => {
          if (!status.isLoaded) return;
          setSoundPlaying(status.isPlaying);
        });
        soundRef.current = sound;
      }
      const { sound: nSound } = await Audio.Sound.createAsync(
        SOUND_FILES['beep'],
        { shouldPlay: false }
      );
      await nSound.setVolumeAsync(state.settings.notificationVolume ?? 1);
      notifySoundRef.current = nSound;
    } catch (e) {
      console.warn('Failed to load sound', e);
    }
  };

  useEffect(() => {
    const name = selectedSet ? selectedSet.sound || 'normal' : quickSound;
    loadSound(name);
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      notifySoundRef.current?.unloadAsync().catch(() => {});
    };
  }, [quickSound, selectedSet?.sound]);

  useEffect(() => {
    soundRef.current?.setVolumeAsync(state.settings.notificationVolume ?? 1);
    notifySoundRef.current?.setVolumeAsync(state.settings.notificationVolume ?? 1);
  }, [state.settings.notificationVolume]);

  useEffect(() => {
    elapsedRef.current = elapsed;
    lastUpdateRef.current = Date.now();
    setProgress(totalDuration > 0 ? clampProgress(elapsed / totalDuration) : 0);
  }, [elapsed, totalDuration]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const diff =
        endTimeRef.current != null
          ? (Date.now() - lastUpdateRef.current) / 1000
          : 0;
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
    setRemaining(getDuration(selectedSet?.timers[0]));
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
    if (nextTimeoutRef.current) {
      clearTimeout(nextTimeoutRef.current);
      nextTimeoutRef.current = null;
    }
  }, [selectedSet]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
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
    if (digits.length > 6) return;
    setQuickDigits(digits);
  };
  const handleQuickKey = (e: any) => {
    if (e.nativeEvent.key === 'Backspace') {
      setQuickDigits(d => d.slice(0, -1));
      e.preventDefault && e.preventDefault();
    }
  };


  const confirmQuick = () => {
    const digits = quickDigits || '0';
    const m = parseInt(digits.slice(0, -2) || '0', 10);
    const s = parseInt(digits.slice(-2) || '0', 10);
    const sec = m * 60 + s;
    const safe = Math.max(0, sec);
    setRemaining(safe);
    setQuickInitial(safe);
    setQuickDigits('');
    setInputVisible(false);
  };

  const start = (initParam?: number | unknown) => {
    const init = typeof initParam === 'number' ? initParam : undefined;
    if (nextTimeoutRef.current) {
      clearTimeout(nextTimeoutRef.current);
      nextTimeoutRef.current = null;
    }
    let rem = Number.isFinite(init ?? remaining) ? Math.max(0, init ?? remaining) : 0;
    soundRef.current?.stopAsync().catch(() => {});
    setSoundPlaying(false);
    if (selectedSet && !historyId) {
      const id = uuidv4();
      dispatch({ type: 'LOG_START', payload: { id, timerSetId: selectedSet.id } });
      setHistoryId(id);
      setRunCount(0);
      setTotalSec(0);
      historyRef.current = { id, total: 0, run: 0 };
      // Ensure a new run always begins from the first timer
      setIndex(0);
      indexRef.current = 0;
      const first = getDuration(selectedSet.timers[0]);
      setRemaining(first);
      rem = Number.isFinite(init ?? first) ? Math.max(0, init ?? first) : 0;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (rem <= 0) {
      setRemaining(0);
      if (selectedSet) {
        // Keep the run state active so that delayed transitions (e.g. when
        // playing a notification sound) can still advance to the next timer.
        runningRef.current = true;
        endOne();
      }
      return;
    }
    elapsedRef.current = elapsed;
    lastUpdateRef.current = Date.now();
    endTimeRef.current = Date.now() + rem * 1000;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      if (endTimeRef.current == null) return;
      const left = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        endTimeRef.current = null;
        setRemaining(0);
      } else {
        setRemaining(left);
      }
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
    if (nextTimeoutRef.current) {
      clearTimeout(nextTimeoutRef.current);
      nextTimeoutRef.current = null;
    }
    endTimeRef.current = null;
    setRunning(false);
    soundRef.current?.stopAsync().catch(() => {});
    notifySoundRef.current?.stopAsync().catch(() => {});
    setSoundPlaying(false);
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
      setRemaining(getDuration(selectedSet?.timers[0]));
    } else {
      setRemaining(0);
      setQuickDigits('');
      setQuickInitial(0);
    }
  };

  const endOne = async () => {
    if (!selectedSet) return;
    const runId = historyRef.current.id;
    const currentIdx = indexRef.current;
    const currentTimer = selectedSet.timers[currentIdx];
    const isLast = currentIdx + 1 >= selectedSet.timers.length;

    let delay = 0;
    if (currentTimer?.notify !== false) {
      if (!isLast) {
        try {
          await notifySoundRef.current?.replayAsync();
          const status = await notifySoundRef.current?.getStatusAsync();
          if (status && status.isLoaded) {
            delay = status.durationMillis ?? 0;
          }
        } catch {}
      } else {
        soundRef.current?.replayAsync().catch(() => {});
      }
    } else if (isLast) {
      soundRef.current?.replayAsync().catch(() => {});
    }

    if (historyRef.current.id !== runId || !runningRef.current) return;

    const duration = getDuration(currentTimer);
    const newRun = runCount + 1;
    const newTotal = totalSec + duration;
    setRunCount(newRun);
    setTotalSec(newTotal);

    if (historyRef.current.id !== runId || !runningRef.current) return;

    if (currentIdx + 1 < selectedSet.timers.length) {
      const nextIdx = currentIdx + 1;
      const nextDur = getDuration(selectedSet.timers[nextIdx]);
      const startNext = () => {
        if (historyRef.current.id !== runId || !runningRef.current) return;
        setIndex(nextIdx);
        indexRef.current = nextIdx;
        setRemaining(nextDur);
        elapsedRef.current = elapsed;
        lastUpdateRef.current = Date.now();
        startRef.current(nextDur);
      };
      if (delay > 0) {
        if (nextTimeoutRef.current) {
          clearTimeout(nextTimeoutRef.current);
          nextTimeoutRef.current = null;
        }
        nextTimeoutRef.current = setTimeout(() => {
          if (historyRef.current.id !== runId || !runningRef.current) return;
          nextTimeoutRef.current = null;
          startNext();
        }, delay);
      } else {
        startNext();
      }
    } else {
      setRunning(false);
      if (historyId && historyRef.current.id === runId) {
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
        soundRef.current?.replayAsync().catch(() => {});
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
              onPress={() => start()}
              disabled={running || (!selectedSet && remaining <= 0)}
              style={{ flex: 1 }}
            />
            <IconButton
              label="停止"
              icon="pause"
              onPress={stop}
              disabled={!running && !soundPlaying}
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
                          {t.label} ({formatHMS(getDuration(t))})
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
              {Platform.OS === 'web' ? (
                <View style={styles.row}>
                  <View style={[styles.select, { flex: 1 }]}>
                    <Text style={styles.selectLabel}>分</Text>
                    <input
                      type="number"
                      value={parseInt(quickDigits.slice(0, -2) || '0', 10)}
                      onChange={(e: any) => {
                        const m = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                        const s = quickDigits.slice(-2).padStart(2, '0');
                        setQuickDigits(`${m}${s}`);
                      }}
                      style={{ flex: 1, textAlign: 'right' }}
                    />
                  </View>
                  <View style={[styles.select, { flex: 1 }]}>
                    <Text style={styles.selectLabel}>秒</Text>
                    <input
                      type="number"
                      value={parseInt(quickDigits.slice(-2) || '0', 10)}
                      onChange={(e: any) => {
                        const s = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                        const m = (quickDigits.slice(0, -2) || '').replace(/[^0-9]/g, '').slice(0, 4);
                        setQuickDigits(`${m}${s.padStart(2, '0')}`);
                      }}
                      style={{ flex: 1, textAlign: 'right' }}
                    />
                  </View>
                </View>
              ) : (
                <TextInput
                  value={quickDigits}
                  onChangeText={handleDigitChange}
                  onKeyPress={handleQuickKey}
                  keyboardType="number-pad"
                  style={styles.hiddenInput}
                  autoFocus
                  maxLength={6}
                />
              )}
            <Pressable style={styles.select} onPress={() => setSoundSelectVisible(true)}>
              <Text style={styles.selectLabel}>終了音</Text>
              <Text style={styles.selectValue}>{SOUND_OPTIONS.find(s => s.value === quickSound)?.label}</Text>
            </Pressable>
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
      <Modal visible={soundSelectVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {SOUND_OPTIONS.map(o => (
                <Pressable
                  key={o.value}
                  style={styles.modalItem}
                  onPress={() => {
                    setQuickSound(o.value);
                    setSoundSelectVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{o.label}</Text>
                </Pressable>
              ))}
              <Pressable
                style={[styles.modalItem, { borderTopWidth: 1, borderTopColor: Colors.border }]}
                onPress={() => setSoundSelectVisible(false)}
              >
                <Text style={[styles.modalItemText, { color: Colors.subText, textAlign: 'center' }]}>キャンセル</Text>
              </Pressable>
            </ScrollView>
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
  pageControl: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    marginBottom: 16,
  },
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
