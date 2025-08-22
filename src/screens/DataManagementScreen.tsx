import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Pressable, Alert } from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';

export default function DataManagementScreen() {
  const { state, dispatch } = useTimerState();

  const deletedSetIds = useMemo(() => {
    const existing = new Set(state.timerSets.map(s => s.id));
    const ids = new Set<string>();
    state.history.forEach(h => {
      if (h.timerSetId && !existing.has(h.timerSetId)) {
        ids.add(h.timerSetId);
      }
    });
    return Array.from(ids);
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
      <Text style={styles.sectionTitle}>削除済みタイマーのデータ</Text>
      {deletedSetIds.length === 0 ? (
        <Text style={styles.empty}>ありません</Text>
      ) : (
        deletedSetIds.map(id => (
          <View key={id} style={styles.row}>
            <Text style={styles.label}>{`ID: ${id}`}</Text>
            <Pressable
              style={styles.deleteBtn}
              onPress={() =>
                Alert.alert('確認', 'このタイマーセットのデータを削除しますか？', [
                  { text: 'キャンセル', style: 'cancel' },
                  {
                    text: '削除',
                    style: 'destructive',
                    onPress: () => dispatch({ type: 'DELETE_HISTORY_BY_SET', payload: { id } }),
                  },
                ])
              }
            >
              <Text style={styles.deleteText}>削除</Text>
            </Pressable>
          </View>
        ))
      )}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  label: { color: Colors.text, flex: 1 },
  deleteBtn: { backgroundColor: Colors.danger, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  deleteText: { color: '#fff' },
  empty: { color: Colors.subText, marginTop: 8 },
});

