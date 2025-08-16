import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TextInput, Alert, Pressable } from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';
import { uuidv4 } from '../utils/uuid';
import IconButton from '../components/IconButton';

export default function CreateScreen() {
  const { state, dispatch } = useTimerState();
  const [label, setLabel] = useState('');
  const [min, setMin] = useState('');
  const [selectedId, setSelectedId] = useState(state.timerSets[0]?.id ?? '');

  const selectedSet = useMemo(
    () => state.timerSets.find(s => s.id === selectedId) ?? null,
    [selectedId, state.timerSets]
  );

  const cycleSet = () => {
    if (state.timerSets.length === 0) return;
    const idx = state.timerSets.findIndex(s => s.id === selectedId);
    const next = state.timerSets[(idx + 1) % state.timerSets.length];
    setSelectedId(next.id);
  };

  const addToSet = () => {
    const m = parseInt(min || '0', 10);
    if (!label.trim() || m <= 0 || !selectedSet) {
      Alert.alert('追加できません', '名前と時間を入力し、タイマーセットを選択してください。');
      return;
    }
    const timer = { id: uuidv4(), label, durationSec: m * 60 };
    const updated = { ...selectedSet, timers: [...selectedSet.timers, timer] };
    dispatch({ type: 'UPDATE_SET', payload: updated });
    setLabel('');
    setMin('');
    Alert.alert('追加しました', `${selectedSet.name} にタイマーを追加しました。`);
  };

  const createSet = () => {
    const m = parseInt(min || '0', 10);
    if (!label.trim() || m <= 0) {
      Alert.alert('作成できません', '名前と時間を入力してください。');
      return;
    }
    dispatch({
      type: 'ADD_SET',
      payload: {
        name: label || '新しいタイマーセット',
        description: '',
        timers: [{ id: uuidv4(), label, durationSec: m * 60 }],
        sound: 'beep',
      },
    });
    setLabel('');
    setMin('');
    Alert.alert('作成しました', '新しいタイマーセットを作成しました。');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>新しいタイマーを追加</Text>
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="例: 勉強"
        style={styles.input}
      />
      <TextInput
        value={min}
        onChangeText={setMin}
        placeholder="例: 25"
        keyboardType="number-pad"
        style={styles.input}
      />

      <Text style={styles.subtitle}>タイマーセット管理</Text>
      <Pressable style={styles.select} onPress={cycleSet}>
        <Text style={styles.selectLabel}>現在のタイマーセット</Text>
        <Text style={styles.selectValue}>{selectedSet ? selectedSet.name : 'なし'}</Text>
      </Pressable>

      <View style={styles.row}>
        <IconButton
          label="タイマーセットに追加"
          icon="add-circle-outline"
          onPress={addToSet}
          style={{ flex: 1 }}
        />
        <IconButton
          label="セットを作成"
          icon="create-outline"
          onPress={createSet}
          type="secondary"
          style={{ flex: 1 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  subtitle: { marginTop: 24, fontSize: 16, fontWeight: '700', color: Colors.text },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
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
  row: { flexDirection: 'row', gap: 12, marginTop: 20 },
});
