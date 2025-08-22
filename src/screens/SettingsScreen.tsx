import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';

export default function SettingsScreen() {
  const { state, dispatch } = useTimerState();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>アプリ設定</Text>
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
});
