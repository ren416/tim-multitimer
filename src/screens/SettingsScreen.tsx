import React from 'react';
import { ScrollView, View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen({ navigation }: any) {
  const { state, dispatch } = useTimerState();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>アプリ設定</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>通知を有効化</Text>
          <Switch
            value={state.settings.enableNotifications}
            onValueChange={v => dispatch({ type: 'UPDATE_SETTINGS', payload: { enableNotifications: v } })}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>画面をスリープさせない</Text>
          <Switch
            value={state.settings.keepAwake}
            onValueChange={v => dispatch({ type: 'UPDATE_SETTINGS', payload: { keepAwake: v } })}
          />
        </View>
        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>
            通知音量 {Math.round((state.settings.notificationVolume ?? 0) * 100)}%
          </Text>
          <View style={styles.volumeControls}>
            <Pressable
              style={styles.volBtn}
              onPress={() =>
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: {
                    notificationVolume: Math.max(0, (state.settings.notificationVolume ?? 0) - 0.1),
                  },
                })
              }
            >
              <Ionicons name="remove" size={20} color={Colors.text} />
            </Pressable>
            <Pressable
              style={[styles.volBtn, { marginLeft: 8 }]}
              onPress={() =>
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: {
                    notificationVolume: Math.min(1, (state.settings.notificationVolume ?? 0) + 0.1),
                  },
                })
              }
            >
              <Ionicons name="add" size={20} color={Colors.text} />
            </Pressable>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Pressable style={styles.row} onPress={() => navigation.navigate('データ管理')}>
          <Text style={styles.label}>データ管理</Text>
          <Ionicons name="chevron-forward-outline" size={20} color={Colors.subText} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  section: { backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 12, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  label: { color: Colors.text },
  volumeControls: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  volBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 6,
    borderRadius: 8,
  },
});
