import React, { useMemo, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';

// 削除済みデータの管理やタイマー表示設定を行う画面

export default function DataManagementScreen() {
  const { state, dispatch } = useTimerState();
  const navigation = useNavigation<any>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => navigation.navigate('設定')} style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: Colors.primaryDark }}>戻る</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const deletedSets = useMemo(() => {
    const existing = new Map(state.timerSets.map(s => [s.id, s.name]));
    const map = new Map<string, string>();
    state.history.forEach(h => {
      if (h.timerSetId && !existing.has(h.timerSetId)) {
        map.set(h.timerSetId, h.timerSetName ?? h.timerSetId);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [state.history, state.timerSets]);

  const toggleHidden = (id: string, hidden: boolean) => {
    let next = state.hiddenTimerSetIds;
    if (hidden) {
      next = [...next, id];
    } else {
      next = next.filter(x => x !== id);
    }
    dispatch({ type: 'SET_HIDDEN_SETS', payload: { ids: next } });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>削除済みタイマーのデータ</Text>
        {deletedSets.length === 0 ? (
          <Text style={styles.empty}>ありません</Text>
        ) : (
          deletedSets.map(s => (
            <View key={s.id} style={styles.row}>
              <Text style={styles.label}>{`${s.name}`}</Text>
              <Pressable
                style={styles.deleteBtn}
                onPress={() =>
                  Alert.alert('確認', 'このタイマーセットのデータを削除しますか？', [
                    { text: 'キャンセル', style: 'cancel' },
                    {
                      text: '削除',
                      style: 'destructive',
                      onPress: () => dispatch({ type: 'DELETE_HISTORY_BY_SET', payload: { id: s.id } }),
                    },
                  ])
                }
              >
                <Text style={styles.deleteText}>削除</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>タイマー表示設定</Text>
        {state.timerSets.length === 0 ? (
          <Text style={styles.empty}>タイマーセットがありません</Text>
        ) : (
          state.timerSets.map(s => (
            <View key={s.id} style={styles.row}>
              <Text style={styles.label}>{s.name}</Text>
              <Switch
                value={!state.hiddenTimerSetIds.includes(s.id)}
                onValueChange={v => toggleHidden(s.id, !v)}
              />
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  label: { color: Colors.text, flex: 1 },
  deleteBtn: { backgroundColor: Colors.danger, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  deleteText: { color: '#fff' },
  empty: { color: Colors.subText, marginTop: 8 },
  note: { color: Colors.subText, fontSize: 12, marginTop: 8 },
});

