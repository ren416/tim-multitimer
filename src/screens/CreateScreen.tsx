import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';
import { uuidv4 } from '../utils/uuid';
import IconButton from '../components/IconButton';
import { SOUND_OPTIONS } from '../constants/sounds';
import { scheduleTimerSetNotification, cancelTimerSetNotification } from '../utils/notifications';

type Stage =
  | 'choose'
  | 'newInfo'
  | 'newTimers'
  | 'selectExisting'
  | 'existingTimers';

type TimerInput = { id?: string; label?: string; min: string; sec: string; notify: boolean };

export default function CreateScreen({ route, navigation }: any) {
  const { state, dispatch } = useTimerState();

  const [stage, setStage] = useState<Stage>('choose');
  const [setName, setSetName] = useState('');
  const [notify, setNotify] = useState(false);
  const [notifyType, setNotifyType] = useState<'datetime' | 'interval'>('datetime');
  const [dateTime, setDateTime] = useState('');
  const [intervalMin, setIntervalMin] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [timers, setTimers] = useState<TimerInput[]>([]);
  const [sound, setSound] = useState('normal');
  const [soundModal, setSoundModal] = useState(false);

  const reset = () => {
    setStage('choose');
    setSetName('');
    setNotify(false);
    setNotifyType('datetime');
    setDateTime('');
    setIntervalMin('');
    setSelectedId('');
    setTimers([]);
    setSound('normal');
    navigation.setParams({ editId: undefined });
  };

  const handleCancel = () => {
    reset();
    navigation.navigate('タイマー一覧');
  };

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

  const toNewInfo = () => {
    reset();
    setStage('newInfo');
  };

  const toSelectExisting = () => {
    reset();
    setStage('selectExisting');
  };

  const startNewTimers = () => {
    if (!setName.trim()) {
      Alert.alert('作成できません', 'セット名を入力してください。');
      return;
    }
    setTimers([{ label: '', min: '', sec: '', notify: true }]);
    setStage('newTimers');
  };

  const selectExisting = (id: string) => {
    const set = state.timerSets.find(s => s.id === id);
    if (!set) return;
    setSelectedId(id);
    setSetName(set.name);
    setSound(set.sound || 'normal');
    if (set.notifications?.enabled) {
      setNotify(true);
      if (set.notifications.scheduleType === 'interval') {
        setNotifyType('interval');
        setIntervalMin(String((set.notifications.intervalSec || 0) / 60));
      } else {
        setNotifyType('datetime');
        setDateTime(set.notifications.dateTime || '');
      }
    } else {
      setNotify(false);
        setNotifyType('datetime');
        setDateTime('');
        setIntervalMin('');
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

  const updateTimer = (
    index: number,
    field: 'label' | 'min' | 'sec' | 'notify',
    value: string | boolean,
  ) => {
    setTimers(prev =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    );
  };

  const addTimerRow = () =>
    setTimers(prev => [...prev, { label: '', min: '', sec: '', notify: true }]);

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
    let notifId: string | undefined;
    if (notify) {
      notifId = await scheduleTimerSetNotification({
        name: setName,
        notifications: {
          enabled: true,
          scheduleType: notifyType,
          dateTime,
          intervalSec: notifyType === 'interval' ? parseInt(intervalMin || '0', 10) * 60 : undefined,
        },
      });
    }
    dispatch({
      type: 'ADD_SET',
      payload: {
        name: setName,
        description: '',
        timers: parsed as any,
        sound,
        notifications: notify
          ? {
              enabled: true,
              scheduleType: notifyType,
              dateTime,
              intervalSec: notifyType === 'interval' ? parseInt(intervalMin || '0', 10) * 60 : undefined,
              id: notifId,
            }
          : { enabled: false },
      },
    });
    Alert.alert('作成しました', '新しいタイマーセットを作成しました。');
    reset();
    navigation.goBack();
  };

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
    await cancelTimerSetNotification(target.notifications?.id);
    let notifId: string | undefined;
    if (notify) {
      notifId = await scheduleTimerSetNotification({
        name: setName,
        notifications: {
          enabled: true,
          scheduleType: notifyType,
          dateTime,
          intervalSec: notifyType === 'interval' ? parseInt(intervalMin || '0', 10) * 60 : undefined,
        },
      });
    }
    const updated = {
      ...target,
      name: setName,
      timers: parsed as any,
      sound,
      notifications: notify
        ? {
            enabled: true,
            scheduleType: notifyType,
            dateTime,
            intervalSec: notifyType === 'interval' ? parseInt(intervalMin || '0', 10) * 60 : undefined,
            id: notifId,
          }
        : { enabled: false },
    };
    dispatch({ type: 'UPDATE_SET', payload: updated });
    Alert.alert('更新しました', `${setName} を更新しました。`);
    reset();
    navigation.goBack();
  };

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
          />
          <View style={styles.timeRow}>
            <TextInput
              value={t.min}
              onChangeText={v => updateTimer(idx, 'min', v)}
              placeholder="分"
              keyboardType="number-pad"
              style={[styles.timerInput, { marginRight: 4 }]}
            />
            <Text style={{ alignSelf: 'center' }}>:</Text>
            <TextInput
              value={t.sec}
              onChangeText={v => updateTimer(idx, 'sec', v)}
              placeholder="秒"
              keyboardType="number-pad"
              style={[styles.timerInput, { marginLeft: 4 }]}
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
              <View style={styles.notifyRow}>
                <Pressable
                  style={[styles.option, notifyType === 'datetime' && styles.optionActive]}
                  onPress={() => setNotifyType('datetime')}
                >
                  <Text style={styles.notifyLabel}>日時指定</Text>
                </Pressable>
                <Pressable
                  style={[styles.option, notifyType === 'interval' && styles.optionActive]}
                  onPress={() => setNotifyType('interval')}
                >
                  <Text style={styles.notifyLabel}>間隔</Text>
                </Pressable>
              </View>
              {notifyType === 'datetime' ? (
                <TextInput
                  value={dateTime}
                  onChangeText={setDateTime}
                  placeholder="YYYY-MM-DD HH:mm"
                  style={styles.input}
                />
              ) : (
                <TextInput
                  value={intervalMin}
                  onChangeText={setIntervalMin}
                  placeholder="間隔(分)"
                  keyboardType="number-pad"
                  style={styles.input}
                />
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
              <View style={styles.notifyRow}>
                <Pressable
                  style={[styles.option, notifyType === 'datetime' && styles.optionActive]}
                  onPress={() => setNotifyType('datetime')}
                >
                  <Text style={styles.notifyLabel}>日時指定</Text>
                </Pressable>
                <Pressable
                  style={[styles.option, notifyType === 'interval' && styles.optionActive]}
                  onPress={() => setNotifyType('interval')}
                >
                  <Text style={styles.notifyLabel}>間隔</Text>
                </Pressable>
              </View>
              {notifyType === 'datetime' ? (
                <TextInput
                  value={dateTime}
                  onChangeText={setDateTime}
                  placeholder="YYYY-MM-DD HH:mm"
                  style={styles.input}
                />
              ) : (
                <TextInput
                  value={intervalMin}
                  onChangeText={setIntervalMin}
                  placeholder="間隔(分)"
                  keyboardType="number-pad"
                  style={styles.input}
                />
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
  modalItem: { paddingVertical: 12 },
  modalItemText: { color: Colors.text, fontWeight: '700', textAlign: 'left' },
});

