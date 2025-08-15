import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch } from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';

export default function SettingsScreen() {
  const { state, dispatch } = useTimerState();
  const [age, setAge] = useState(state.settings.age ? String(state.settings.age) : '');
  const [gender, setGender] = useState(state.settings.gender ?? 'unspecified');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>個人設定</Text>
      <View style={styles.row}>
        <Text style={styles.label}>年齢</Text>
        <TextInput value={age} onChangeText={(t)=>{ setAge(t); dispatch({type:'UPDATE_SETTINGS', payload:{ age: parseInt(t||'0',10) || undefined }}) }} keyboardType="number-pad" style={styles.input} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>性別</Text>
        <TextInput value={gender} onChangeText={(t)=>{ setGender(t as any); dispatch({type:'UPDATE_SETTINGS', payload:{ gender: t as any }}) }} style={styles.input} placeholder="male/female/other/unspecified" />
      </View>

      <Text style={[styles.title,{marginTop:16}]}>アプリ設定</Text>
      <View style={styles.row}>
        <Text style={styles.label}>通知を有効化</Text>
        <Switch value={state.settings.enableNotifications} onValueChange={(v)=>dispatch({type:'UPDATE_SETTINGS', payload:{ enableNotifications: v }})} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>画面をスリープさせない</Text>
        <Switch value={state.settings.keepAwake} onValueChange={(v)=>dispatch({type:'UPDATE_SETTINGS', payload:{ keepAwake: v }})} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  label: { color: Colors.text },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, width: 200 },
});
