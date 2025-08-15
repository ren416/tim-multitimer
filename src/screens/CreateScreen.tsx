import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { Colors } from '../constants/colors';
import TimerItemForm from '../components/TimerItemForm';
import { useTimerState } from '../context/TimerContext';
import { v4 as uuidv4 } from 'uuid';

export default function CreateScreen() {
  const { dispatch } = useTimerState();
  const [name, setName] = useState('新しいタイマーセット');
  const [description, setDescription] = useState('');
  const [timers, setTimers] = useState<{id:string; label:string; durationSec:number; note?:string}[]>([
    { id: uuidv4(), label: '集中', durationSec: 25*60 },
  ]);

  const addTimer = () => setTimers([...timers, { id: uuidv4(), label: '', durationSec: 60 }]);

  const save = () => {
    if (!name.trim() || timers.length === 0 || timers.some(t => t.durationSec <= 0)) {
      Alert.alert('保存できません', '名前を入力し、各タイマーに1秒以上の時間を設定してください。');
      return;
    }
    dispatch({ type: 'ADD_SET', payload: {
      name, description, timers, sound: 'beep'
    }});
    setName('新しいタイマーセット');
    setDescription('');
    setTimers([{ id: uuidv4(), label: '集中', durationSec: 25*60 }]);
    Alert.alert('保存しました', '「タイマー一覧」から確認できます。');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding:16}}>
      <Text style={styles.title}>タイマーセットの作成</Text>
      <TextInput value={name} onChangeText={setName} placeholder="セット名" style={styles.input} />
      <TextInput value={description} onChangeText={setDescription} placeholder="説明（任意）" style={styles.input} />

      <Text style={styles.subtitle}>タイマー</Text>
      {timers.map((t, idx) => (
        <TimerItemForm
          key={t.id}
          value={t}
          onChange={(v)=>{
            const list = timers.slice();
            list[idx] = { ...t, ...v };
            setTimers(list);
          }}
          onRemove={() => {
            const list = timers.filter(x => x.id !== t.id);
            setTimers(list);
          }}
        />
      ))}
      <Pressable onPress={addTimer} style={[styles.btn, styles.secondary]}>
        <Text style={styles.btnText}>＋ タイマーを追加</Text>
      </Pressable>

      <Pressable onPress={save} style={[styles.btn, styles.primary]}>
        <Text style={styles.btnText}>保存</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  subtitle: { marginTop: 16, fontSize: 16, fontWeight: '700', color: Colors.text },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  btn: { marginTop: 12, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  btnText: { fontWeight: '700', color: '#0B1D2A' },
});
