import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
  UIManager,
  findNodeHandle,
} from 'react-native';
// タイマーセットの作成や既存セットの編集を行う画面
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';
import { uuidv4 } from '../utils/uuid';
import IconButton from '../components/IconButton';
import { SOUND_OPTIONS } from '../constants/sounds';
import { scheduleTimerSetNotification, cancelTimerSetNotification } from '../utils/notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import dayjs from 'dayjs';
import { NotificationConfig } from '../context/TimerContext';

type Stage =
  | 'choose'
  | 'newInfo'
  | 'newTimers'
  | 'selectExisting'
  | 'existingTimers';

type TimerInput = { id?: string; label?: string; min: string; sec: string; notify: boolean };

export default function CreateScreen({ route, navigation }: any) {
  const { state, dispatch } = useTimerState();
  const scrollRef = useRef<ScrollView>(null);

  const [stage, setStage] = useState<Stage>('choose');
  const [setName, setSetName] = useState('');
  const [notify, setNotify] = useState(false);
  const [notifyDate, setNotifyDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notifyTime, setNotifyTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'interval' | 'weekday' | 'monthly'>('interval');
  const [repeatNum, setRepeatNum] = useState('1');
  const [repeatUnit, setRepeatUnit] = useState<'minute' | 'hour' | 'day' | 'week' | 'year'>('day');
  const [repeatWeekInterval, setRepeatWeekInterval] = useState<'every' | 'biweekly'>('every');
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([]);
  const [repeatNthWeek, setRepeatNthWeek] = useState(1);
  const [repeatNthWeekday, setRepeatNthWeekday] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [timers, setTimers] = useState<TimerInput[]>([]);
  const [sound, setSound] = useState('normal');
  const [soundModal, setSoundModal] = useState(false);
  const [tempNotifyTime, setTempNotifyTime] = useState<Date>(new Date());
  const [showRepeatUnitPicker, setShowRepeatUnitPicker] = useState(false);
  const [tempRepeatUnit, setTempRepeatUnit] = useState<'minute' | 'hour' | 'day' | 'week' | 'year'>('day');
  const [showNthWeekPicker, setShowNthWeekPicker] = useState(false);
  const [tempNthWeek, setTempNthWeek] = useState(1);
  const [showWeekdayPicker, setShowWeekdayPicker] = useState(false);
  const [tempWeekday, setTempWeekday] = useState(0);

  // 画面で使用するすべての入力状態を初期化する
  const reset = () => {
    setStage('choose');
    setSetName('');
    setNotify(false);
    setNotifyDate(new Date());
    setNotifyTime(new Date());
    setTempNotifyTime(new Date());
    setShowDatePicker(false);
    setShowTimePicker(false);
    setRepeatEnabled(false);
    setRepeatMode('interval');
    setRepeatNum('1');
    setRepeatUnit('day');
    setTempRepeatUnit('day');
    setShowRepeatUnitPicker(false);
    setShowNthWeekPicker(false);
    setTempNthWeek(1);
    setShowWeekdayPicker(false);
    setTempWeekday(0);
    setRepeatWeekInterval('every');
    setRepeatWeekdays([]);
    setRepeatNthWeek(1);
    setRepeatNthWeekday(0);
    setSelectedId('');
    setTimers([]);
    setSound('normal');
    navigation.setParams({ editId: undefined });
  };

  // 編集を取りやめてタイマー一覧へ戻る
  const handleCancel = () => {
    reset();
    navigation.navigate('タイマー一覧');
  };

  // 指定した入力欄が画面中央付近にくるようスクロールする
  const scrollToInput = (target: number) => {
    const scrollHandle = findNodeHandle(scrollRef.current);
    if (!scrollHandle) return;
    UIManager.measureLayout(
      target,
      scrollHandle,
      () => {},
      (_x, y, _w, h) => {
        const screenHeight = Dimensions.get('window').height;
        const desiredCenter = screenHeight / 2 - 60;
        const offset = y + h / 2 - desiredCenter;
        scrollRef.current?.scrollTo({ y: offset > 0 ? offset : 0, animated: true });
      },
    );
  };

  // 時刻ピッカーで選択された時間を確定
  const confirmTimePicker = () => {
    setNotifyTime(tempNotifyTime);
    setShowTimePicker(false);
  };

  // 繰り返し間隔の単位を確定
  const confirmRepeatUnit = () => {
    setRepeatUnit(tempRepeatUnit);
    setShowRepeatUnitPicker(false);
  };

  // 月間繰り返しで指定した第n週を確定
  const confirmNthWeek = () => {
    setRepeatNthWeek(tempNthWeek);
    setShowNthWeekPicker(false);
  };

  // 繰り返しの曜日を確定
  const confirmWeekday = () => {
    setRepeatNthWeekday(tempWeekday);
    setShowWeekdayPicker(false);
  };

  const unitLabels: Record<'minute' | 'hour' | 'day' | 'week' | 'year', string> = {
    minute: '分',
    hour: '時間',
    day: '日',
    week: '週',
    year: '年',
  };

  // 画面の状態に応じてヘッダータイトルや戻るボタンを設定
  useEffect(() => {
    let title = '作成';
    if (stage === 'newInfo' || stage === 'newTimers') {
      if (setName.trim()) {
        title = `作成: ${setName}`;
      } else {
        title = '作成';
      }
    } else if (stage === 'selectExisting' || stage === 'existingTimers') {
      title = '編集';
      const targetId = selectedId || route?.params?.editId;
      const target = state.timerSets.find(s => s.id === targetId);
      if (target) {
        title = `編集: ${target.name}`;
      }
    }
    navigation.setOptions({
      title,
      headerLeft: () => (
        <Pressable onPress={handleCancel} style={{ marginLeft: 8 }}>
          <Text style={{ color: Colors.primary }}>キャンセル</Text>
        </Pressable>
      ),
    });
  }, [stage, setName, selectedId, state.timerSets, navigation, route?.params?.editId]);

  // 新規タイマーセット作成フローを開始
  const toNewInfo = () => {
    reset();
    setStage('newInfo');
  };

  // 既存タイマーセットの編集フローを開始
  const toSelectExisting = () => {
    reset();
    setStage('selectExisting');
  };

  // セット名入力後にタイマー入力段階へ進む
  const startNewTimers = () => {
    if (!setName.trim()) {
      Alert.alert('作成できません', 'セット名を入力してください。');
      return;
    }
    setTimers([{ label: '', min: '', sec: '', notify: true }]);
    setStage('newTimers');
  };

  // 編集対象の既存タイマーセットを読み込む
  const selectExisting = (id: string) => {
    const set = state.timerSets.find(s => s.id === id);
    if (!set) return;
    setSelectedId(id);
    setSetName(set.name);
    setSound(set.sound || 'normal');
    if (set.notifications?.enabled) {
      setNotify(true);
      if (set.notifications.date) {
        setNotifyDate(new Date(set.notifications.date));
      }
      if (set.notifications.time) {
        const [h, m] = set.notifications.time.split(':');
        const dt = dayjs().hour(Number(h)).minute(Number(m)).second(0).toDate();
        setNotifyTime(dt);
      }
      if (set.notifications.repeat) {
        setRepeatEnabled(true);
        const rep = set.notifications.repeat;
        if (rep.mode === 'interval') {
          setRepeatMode('interval');
          setRepeatNum(String(rep.every));
          setRepeatUnit(rep.unit);
        } else if (rep.mode === 'weekday') {
          setRepeatMode('weekday');
          setRepeatWeekInterval(rep.intervalWeeks === 2 ? 'biweekly' : 'every');
          setRepeatWeekdays(rep.weekdays);
        } else if (rep.mode === 'monthly') {
          setRepeatMode('monthly');
          setRepeatNthWeek(rep.nthWeek);
          setRepeatNthWeekday(rep.weekday);
        }
      } else {
        setRepeatEnabled(false);
      }
    } else {
      setNotify(false);
      setRepeatEnabled(false);
    }
    setTimers(
      set.timers.map(t => ({
        id: t.id,
        label: t.label,
        min: String(Math.floor(t.durationSec / 60)),
        sec: String(t.durationSec % 60).padStart(2, '0'),
        notify: t.notify !== false,
      }))
    );
    setStage('existingTimers');
  };

  // タイマー入力の特定フィールドを更新する
  const updateTimer = (
    index: number,
    field: 'label' | 'min' | 'sec' | 'notify',
    value: string | boolean,
  ) => {
    setTimers(prev =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    );
  };

  // 新しいタイマー入力行を追加
  const addTimerRow = () =>
    setTimers(prev => [...prev, { label: '', min: '', sec: '', notify: true }]);

  // 新規にタイマーセットを保存
  const saveNew = async () => {
    const parsed = timers
      .map((t, i) => {
        const m = parseInt(t.min || '0', 10);
        const s = parseInt(t.sec || '0', 10);
        const total = m * 60 + s;
        if (total <= 0) return null;
        return {
          id: uuidv4(),
          label: t.label || `タイマー${i + 1}`,
          durationSec: total,
          notify: t.notify,
        };
      })
      .filter(Boolean);
    if (parsed.length === 0) {
      Alert.alert('作成できません', 'タイマーを入力してください。');
      return;
    }
    let notifIds: string[] | undefined;
    let notifConfig: NotificationConfig | undefined;
    if (notify) {
      notifConfig = {
        enabled: true,
        date: dayjs(notifyDate).format('YYYY-MM-DD'),
        time: dayjs(notifyTime).format('HH:mm'),
        repeat: repeatEnabled
          ? repeatMode === 'interval'
            ? { mode: 'interval', every: Number(repeatNum), unit: repeatUnit }
            : repeatMode === 'weekday'
            ? {
                mode: 'weekday',
                intervalWeeks: repeatWeekInterval === 'biweekly' ? 2 : 1,
                weekdays: repeatWeekdays,
              }
            : { mode: 'monthly', nthWeek: repeatNthWeek, weekday: repeatNthWeekday }
          : undefined,
      };
      notifIds = await scheduleTimerSetNotification({
        name: setName,
        notifications: notifConfig,
      });
      notifConfig.ids = notifIds;
    }
    dispatch({
      type: 'ADD_SET',
      payload: {
        name: setName,
        description: '',
        timers: parsed as any,
        sound,
        notifications: notify ? notifConfig : { enabled: false },
      },
    });
    Alert.alert('作成しました', '新しいタイマーセットを作成しました。');
    reset();
    navigation.goBack();
  };

  // 既存タイマーセットの変更を保存
  const saveExisting = async () => {
    const target = state.timerSets.find(s => s.id === selectedId);
    if (!target) return;
    const parsed = timers
      .map((t, i) => {
        const m = parseInt(t.min || '0', 10);
        const s = parseInt(t.sec || '0', 10);
        const total = m * 60 + s;
        if (total <= 0) return null;
        return {
          id: t.id || uuidv4(),
          label: t.label || `タイマー${i + 1}`,
          durationSec: total,
          notify: t.notify,
        };
      })
      .filter(Boolean);
    if (parsed.length === 0) {
      Alert.alert('更新できません', 'タイマーを入力してください。');
      return;
    }
    await cancelTimerSetNotification(target.notifications?.ids);
    let notifIds: string[] | undefined;
    let notifConfig: NotificationConfig | undefined;
    if (notify) {
      notifConfig = {
        enabled: true,
        date: dayjs(notifyDate).format('YYYY-MM-DD'),
        time: dayjs(notifyTime).format('HH:mm'),
        repeat: repeatEnabled
          ? repeatMode === 'interval'
            ? { mode: 'interval', every: Number(repeatNum), unit: repeatUnit }
            : repeatMode === 'weekday'
            ? {
                mode: 'weekday',
                intervalWeeks: repeatWeekInterval === 'biweekly' ? 2 : 1,
                weekdays: repeatWeekdays,
              }
            : { mode: 'monthly', nthWeek: repeatNthWeek, weekday: repeatNthWeekday }
          : undefined,
      };
      notifIds = await scheduleTimerSetNotification({
        name: setName,
        notifications: notifConfig,
      });
      notifConfig.ids = notifIds;
    }
    const updated = {
      ...target,
      name: setName,
      timers: parsed as any,
      sound,
      notifications: notify ? notifConfig : { enabled: false },
    };
    dispatch({ type: 'UPDATE_SET', payload: updated });
    Alert.alert('更新しました', `${setName} を更新しました。`);
    reset();
    navigation.goBack();
  };

  // 複数のタイマー入力フォームを描画
  const renderTimerRows = () => (
    <View>
      {timers.map((t, idx) => (
        <View key={idx} style={styles.timerBlock}>
          <Text style={styles.timerBlockTitle}>{`タイマー${idx + 1}`}</Text>
          <TextInput
            value={t.label}
            onChangeText={v => updateTimer(idx, 'label', v)}
            placeholder="タイマー名"
            style={styles.timerNameInput}
            onFocus={e => scrollToInput(e.nativeEvent.target)}
          />
          <View style={styles.timeRow}>
            <TextInput
              value={t.min}
              onChangeText={v => updateTimer(idx, 'min', v)}
              placeholder="分"
              keyboardType="number-pad"
              style={[styles.timerInput, { marginRight: 4 }]}
              onFocus={e => scrollToInput(e.nativeEvent.target)}
            />
            <Text style={{ alignSelf: 'center' }}>:</Text>
            <TextInput
              value={t.sec}
              onChangeText={v => updateTimer(idx, 'sec', v)}
              placeholder="秒"
              keyboardType="number-pad"
              style={[styles.timerInput, { marginLeft: 4 }]}
              onFocus={e => scrollToInput(e.nativeEvent.target)}
            />
          </View>
          <View style={styles.notifyRow}>
            <Text style={styles.notifyLabel}>終了時音で知らせる</Text>
            <Switch value={t.notify} onValueChange={v => updateTimer(idx, 'notify', v)} />
          </View>
        </View>
      ))}
      <Pressable onPress={addTimerRow} style={styles.addIcon}>
        <Ionicons name="add-circle-outline" size={36} color={Colors.primary} />
      </Pressable>
    </View>
  );

  useEffect(() => {
    if (route?.params?.editId) {
      reset();
      selectExisting(route.params.editId);
    }
  }, [route?.params?.editId]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 64,
        }}
        keyboardShouldPersistTaps="handled"
      >
      {stage === 'choose' && (
        <View style={{ gap: 12 }}>
          <IconButton
            label="新しいタイマーセットを追加する"
            icon="add-circle-outline"
            onPress={toNewInfo}
            style={{ alignSelf: 'stretch' }}
          />
          <IconButton
            label="既存のタイマーセットに追加する"
            icon="create-outline"
            onPress={toSelectExisting}
            style={{ alignSelf: 'stretch' }}
            type="secondary"
          />
        </View>
      )}

      {stage === 'newInfo' && (
        <View>
          <Text style={styles.title}>セット情報</Text>
          <TextInput
            value={setName}
            onChangeText={setSetName}
            placeholder="セット名"
            style={styles.input}
            onFocus={e => scrollToInput(e.nativeEvent.target)}
          />
          <Pressable style={styles.select} onPress={() => setSoundModal(true)}>
            <Text style={styles.notifyLabel}>終了音</Text>
            <Text style={styles.selectValue}>{SOUND_OPTIONS.find(s => s.value === sound)?.label}</Text>
          </Pressable>
          <View style={styles.notifyRow}>
            <Text style={styles.notifyLabel}>通知を有効にする</Text>
            <Switch value={notify} onValueChange={setNotify} />
          </View>
          {notify && (
            <>
              {Platform.OS === 'web' ? (
                <>
                  <View style={styles.select}>
                    <Text style={styles.notifyLabel}>日付</Text>
                    <input
                      type="date"
                      value={dayjs(notifyDate).format('YYYY-MM-DD')}
                      onChange={(e: any) => setNotifyDate(dayjs(e.target.value).toDate())}
                      style={{ flex: 1, textAlign: 'right' }}
                    />
                  </View>
                  <View style={styles.select}>
                    <Text style={styles.notifyLabel}>時間</Text>
                    <input
                      type="time"
                      value={dayjs(notifyTime).format('HH:mm')}
                      onChange={(e: any) => {
                        const [h, m] = e.target.value.split(':');
                        const dt = dayjs().hour(Number(h)).minute(Number(m)).second(0).toDate();
                        setNotifyTime(dt);
                      }}
                      style={{ flex: 1, textAlign: 'right' }}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Pressable style={styles.select} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.notifyLabel}>日付</Text>
                    <Text style={styles.selectValue}>{dayjs(notifyDate).format('YYYY-MM-DD')}</Text>
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker
                      value={notifyDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                      locale="ja"
                      onChange={(e, d) => {
                        setShowDatePicker(false);
                        if (d) setNotifyDate(d);
                      }}
                    />
                  )}
                  <Pressable
                    style={styles.select}
                    onPress={() => {
                      setTempNotifyTime(notifyTime);
                      setShowTimePicker(true);
                    }}
                  >
                    <Text style={styles.notifyLabel}>時間</Text>
                    <Text style={styles.selectValue}>{dayjs(notifyTime).format('HH:mm')}</Text>
                  </Pressable>
                </>
              )}
              <View style={styles.notifyRow}>
                <Text style={styles.notifyLabel}>繰り返し</Text>
                <Switch value={repeatEnabled} onValueChange={setRepeatEnabled} />
              </View>
              {repeatEnabled && (
                <>
                  <View style={styles.notifyRow}>
                    <Pressable
                      style={[styles.option, repeatMode === 'interval' && styles.optionActive]}
                      onPress={() => setRepeatMode('interval')}
                    >
                      <Text style={styles.notifyLabel}>間隔</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.option, repeatMode === 'weekday' && styles.optionActive]}
                      onPress={() => setRepeatMode('weekday')}
                    >
                      <Text style={styles.notifyLabel}>曜日</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.option, repeatMode === 'monthly' && styles.optionActive]}
                      onPress={() => setRepeatMode('monthly')}
                    >
                      <Text style={styles.notifyLabel}>月</Text>
                    </Pressable>
                  </View>
                  {repeatMode === 'interval' && (
                    <View style={styles.timeRow}>
                      <TextInput
                        keyboardType="number-pad"
                        value={repeatNum}
                        onChangeText={setRepeatNum}
                        style={[styles.timerInput, { flex: 1 }]}
                        onFocus={e => scrollToInput(e.nativeEvent.target)}
                      />
                      <Pressable
                        style={[styles.timerInput, { flex: 1, marginLeft: 4, justifyContent: 'center' }]}
                        onPress={() => {
                          setTempRepeatUnit(repeatUnit);
                          setShowRepeatUnitPicker(true);
                        }}
                      >
                        <Text>{unitLabels[repeatUnit]}</Text>
                      </Pressable>
                    </View>
                  )}
                  {repeatMode === 'weekday' && (
                    <>
                      <View style={styles.notifyRow}>
                        <Pressable
                          style={[styles.option, repeatWeekInterval === 'every' && styles.optionActive]}
                          onPress={() => setRepeatWeekInterval('every')}
                        >
                          <Text style={styles.notifyLabel}>毎週</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.option, repeatWeekInterval === 'biweekly' && styles.optionActive]}
                          onPress={() => setRepeatWeekInterval('biweekly')}
                        >
                          <Text style={styles.notifyLabel}>隔週</Text>
                        </Pressable>
                      </View>
                      <View style={styles.weekdayRow}>
                        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                          <Pressable
                            key={i}
                            style={[
                              styles.weekdayBtn,
                              repeatWeekdays.includes(i) && styles.weekdayBtnActive,
                            ]}
                            onPress={() =>
                              setRepeatWeekdays(prev =>
                                prev.includes(i)
                                  ? prev.filter(p => p !== i)
                                  : [...prev, i],
                              )
                            }
                          >
                            <Text style={styles.weekdayText}>{d}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}
                  {repeatMode === 'monthly' && (
                    <View style={styles.timeRow}>
                      <Pressable
                        style={[styles.timerInput, { flex: 1, justifyContent: 'center' }]}
                        onPress={() => {
                          setTempNthWeek(repeatNthWeek);
                          setShowNthWeekPicker(true);
                        }}
                      >
                        <Text>{`第${repeatNthWeek}`}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.timerInput, { flex: 1, marginLeft: 4, justifyContent: 'center' }]}
                        onPress={() => {
                          setTempWeekday(repeatNthWeekday);
                          setShowWeekdayPicker(true);
                        }}
                      >
                        <Text>
                          {['日', '月', '火', '水', '木', '金', '土'][repeatNthWeekday]}
                          曜
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </>
          )}
          <IconButton
            label="次へ"
            icon="arrow-forward-circle-outline"
            onPress={startNewTimers}
            style={{ marginTop: 20, marginBottom: 40 }}
          />
        </View>
      )}

      {stage === 'selectExisting' && (
        <View>
          <Text style={styles.title}>タイマーセットを選択</Text>
          {state.timerSets.map(s => (
            <Pressable key={s.id} style={styles.select} onPress={() => selectExisting(s.id)}>
              <Text style={styles.selectValue}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {stage === 'newTimers' && (
        <View>
          <Text style={styles.title}>タイマーを設定</Text>
          {renderTimerRows()}
          <IconButton
            label="セットを保存"
            icon="save-outline"
            onPress={saveNew}
            style={{ marginTop: 20, marginBottom: 40 }}
          />
        </View>
      )}

      {stage === 'existingTimers' && (
        <View>
          <Text style={styles.title}>セット名</Text>
          <TextInput
            value={setName}
            onChangeText={setSetName}
            placeholder="セット名"
            style={styles.input}
            onFocus={e => scrollToInput(e.nativeEvent.target)}
          />
          <Pressable style={styles.select} onPress={() => setSoundModal(true)}>
            <Text style={styles.notifyLabel}>終了音</Text>
            <Text style={styles.selectValue}>{SOUND_OPTIONS.find(s => s.value === sound)?.label}</Text>
          </Pressable>
          <View style={styles.notifyRow}>
            <Text style={styles.notifyLabel}>通知を有効にする</Text>
            <Switch value={notify} onValueChange={setNotify} />
          </View>
          {notify && (
            <>
              {Platform.OS === 'web' ? (
                <>
                  <View style={styles.select}>
                    <Text style={styles.notifyLabel}>日付</Text>
                    <input
                      type="date"
                      value={dayjs(notifyDate).format('YYYY-MM-DD')}
                      onChange={(e: any) => setNotifyDate(dayjs(e.target.value).toDate())}
                      style={{ flex: 1, textAlign: 'right' }}
                    />
                  </View>
                  <View style={styles.select}>
                    <Text style={styles.notifyLabel}>時間</Text>
                    <input
                      type="time"
                      value={dayjs(notifyTime).format('HH:mm')}
                      onChange={(e: any) => {
                        const [h, m] = e.target.value.split(':');
                        const dt = dayjs().hour(Number(h)).minute(Number(m)).second(0).toDate();
                        setNotifyTime(dt);
                      }}
                      style={{ flex: 1, textAlign: 'right' }}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Pressable style={styles.select} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.notifyLabel}>日付</Text>
                    <Text style={styles.selectValue}>{dayjs(notifyDate).format('YYYY-MM-DD')}</Text>
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker
                      value={notifyDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                      locale="ja"
                      onChange={(e, d) => {
                        setShowDatePicker(false);
                        if (d) setNotifyDate(d);
                      }}
                    />
                  )}
                  <Pressable
                    style={styles.select}
                    onPress={() => {
                      setTempNotifyTime(notifyTime);
                      setShowTimePicker(true);
                    }}
                  >
                    <Text style={styles.notifyLabel}>時間</Text>
                    <Text style={styles.selectValue}>{dayjs(notifyTime).format('HH:mm')}</Text>
                  </Pressable>
                </>
              )}
              <View style={styles.notifyRow}>
                <Text style={styles.notifyLabel}>繰り返し</Text>
                <Switch value={repeatEnabled} onValueChange={setRepeatEnabled} />
              </View>
              {repeatEnabled && (
                <>
                  <View style={styles.notifyRow}>
                    <Pressable
                      style={[styles.option, repeatMode === 'interval' && styles.optionActive]}
                      onPress={() => setRepeatMode('interval')}
                    >
                      <Text style={styles.notifyLabel}>間隔</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.option, repeatMode === 'weekday' && styles.optionActive]}
                      onPress={() => setRepeatMode('weekday')}
                    >
                      <Text style={styles.notifyLabel}>曜日</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.option, repeatMode === 'monthly' && styles.optionActive]}
                      onPress={() => setRepeatMode('monthly')}
                    >
                      <Text style={styles.notifyLabel}>月</Text>
                    </Pressable>
                  </View>
                  {repeatMode === 'interval' && (
                    <View style={styles.timeRow}>
                      <TextInput
                        keyboardType="number-pad"
                        value={repeatNum}
                        onChangeText={setRepeatNum}
                        style={[styles.timerInput, { flex: 1 }]}
                        onFocus={e => scrollToInput(e.nativeEvent.target)}
                      />
                      <Pressable
                        style={[styles.timerInput, { flex: 1, marginLeft: 4, justifyContent: 'center' }]}
                        onPress={() => {
                          setTempRepeatUnit(repeatUnit);
                          setShowRepeatUnitPicker(true);
                        }}
                      >
                        <Text>{unitLabels[repeatUnit]}</Text>
                      </Pressable>
                    </View>
                  )}
                  {repeatMode === 'weekday' && (
                    <>
                      <View style={styles.notifyRow}>
                        <Pressable
                          style={[styles.option, repeatWeekInterval === 'every' && styles.optionActive]}
                          onPress={() => setRepeatWeekInterval('every')}
                        >
                          <Text style={styles.notifyLabel}>毎週</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.option, repeatWeekInterval === 'biweekly' && styles.optionActive]}
                          onPress={() => setRepeatWeekInterval('biweekly')}
                        >
                          <Text style={styles.notifyLabel}>隔週</Text>
                        </Pressable>
                      </View>
                      <View style={styles.weekdayRow}>
                        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                          <Pressable
                            key={i}
                            style={[
                              styles.weekdayBtn,
                              repeatWeekdays.includes(i) && styles.weekdayBtnActive,
                            ]}
                            onPress={() =>
                              setRepeatWeekdays(prev =>
                                prev.includes(i)
                                  ? prev.filter(p => p !== i)
                                  : [...prev, i],
                              )
                            }
                          >
                            <Text style={styles.weekdayText}>{d}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}
                  {repeatMode === 'monthly' && (
                    <View style={styles.timeRow}>
                      <Pressable
                        style={[styles.timerInput, { flex: 1, justifyContent: 'center' }]}
                        onPress={() => {
                          setTempNthWeek(repeatNthWeek);
                          setShowNthWeekPicker(true);
                        }}
                      >
                        <Text>{`第${repeatNthWeek}`}</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.timerInput,
                          { flex: 1, marginLeft: 4, justifyContent: 'center' },
                        ]}
                        onPress={() => {
                          setTempWeekday(repeatNthWeekday);
                          setShowWeekdayPicker(true);
                        }}
                      >
                        <Text>
                          {['日', '月', '火', '水', '木', '金', '土'][repeatNthWeekday]}
                          曜
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </>
          )}
          <Text style={[styles.title, { marginTop: 20 }]}>タイマーを設定</Text>
          {renderTimerRows()}
          <IconButton
            label="保存"
            icon="save-outline"
            onPress={saveExisting}
            style={{ marginTop: 20, marginBottom: 40 }}
          />
        </View>
      )}
      </ScrollView>
      <Modal visible={showTimePicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={confirmTimePicker}>
          <Pressable style={styles.pickerContainer} onPress={() => {}}>
            <DateTimePicker
              value={tempNotifyTime}
              mode="time"
              display="spinner"
              locale="ja"
              onChange={(e, d) => d && setTempNotifyTime(d)}
            />
            <Pressable style={styles.doneButton} onPress={confirmTimePicker}>
              <Text style={styles.doneButtonText}>完了</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={showRepeatUnitPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={confirmRepeatUnit}>
          <Pressable style={styles.pickerContainer} onPress={() => {}}>
            <Picker
              selectedValue={tempRepeatUnit}
              onValueChange={itemValue => setTempRepeatUnit(itemValue)}
              style={{ width: '100%' }}
            >
              <Picker.Item label="分" value="minute" />
              <Picker.Item label="時間" value="hour" />
              <Picker.Item label="日" value="day" />
              <Picker.Item label="週" value="week" />
              <Picker.Item label="年" value="year" />
            </Picker>
            <Pressable style={styles.doneButton} onPress={confirmRepeatUnit}>
              <Text style={styles.doneButtonText}>完了</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={showNthWeekPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={confirmNthWeek}>
          <Pressable style={styles.pickerContainer} onPress={() => {}}>
            <Picker
              selectedValue={tempNthWeek}
              onValueChange={itemValue => setTempNthWeek(Number(itemValue))}
              style={{ width: '100%' }}
            >
              {[1, 2, 3, 4].map(n => (
                <Picker.Item key={n} label={`第${n}`} value={n} />
              ))}
            </Picker>
            <Pressable style={styles.doneButton} onPress={confirmNthWeek}>
              <Text style={styles.doneButtonText}>完了</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={showWeekdayPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={confirmWeekday}>
          <Pressable style={styles.pickerContainer} onPress={() => {}}>
            <Picker
              selectedValue={tempWeekday}
              onValueChange={itemValue => setTempWeekday(Number(itemValue))}
              style={{ width: '100%' }}
            >
              {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                <Picker.Item key={i} label={`${d}曜`} value={i} />
              ))}
            </Picker>
            <Pressable style={styles.doneButton} onPress={confirmWeekday}>
              <Text style={styles.doneButtonText}>完了</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={soundModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {SOUND_OPTIONS.map(o => (
                <Pressable
                  key={o.value}
                  style={styles.modalItem}
                  onPress={() => {
                    setSound(o.value);
                    setSoundModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{o.label}</Text>
                </Pressable>
              ))}
              <Pressable
                style={[styles.modalItem, { borderTopWidth: 1, borderTopColor: Colors.border }]}
                onPress={() => setSoundModal(false)}
              >
                <Text style={[styles.modalItemText, { color: Colors.subText, textAlign: 'center' }]}>キャンセル</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  notifyRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifyLabel: { color: Colors.text },
  select: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  selectValue: { color: Colors.text, fontWeight: '700' },
  option: {
    flex: 1,
    padding: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  optionActive: {
    borderColor: Colors.primary,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  weekdayBtn: {
    flex: 1,
    padding: 6,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  weekdayBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  weekdayText: { color: Colors.text },
  timerBlock: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  timerBlockTitle: { color: Colors.text, fontWeight: '700' },
  timerNameInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timerInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  addIcon: { alignItems: 'center', marginTop: 12 },
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
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: 320,
  },
  doneButton: { marginTop: 8, alignSelf: 'flex-end' },
  doneButtonText: { color: Colors.primary, fontWeight: '700' },
  modalItem: { paddingVertical: 12 },
  modalItemText: { color: Colors.text, fontWeight: '700', textAlign: 'left' },
});

