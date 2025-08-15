import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, Alert } from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';
import { formatHMS } from '../utils/format';
import TimerRunner from '../components/TimerRunner';

export default function HomeScreen() {
  const { state } = useTimerState();
  const [quickMin, setQuickMin] = useState('25');
  const [runningSetId, setRunningSetId] = useState<string | null>(null);

  const selectedSet = useMemo(
    () => state.timerSets.find(s => s.id === runningSetId) ?? null,
    [runningSetId, state.timerSets]
  );

  return (
    <View style={styles.container}>
      {selectedSet ? (
        <TimerRunner
          timerSet={selectedSet}
          onFinish={() => { setRunningSetId(null); Alert.alert('完了', 'タイマーセットが終了しました'); }}
          onCancel={() => setRunningSetId(null)}
        />
      ) : (
        <>
          <Text style={styles.title}>クイックタイマー</Text>
          <View style={styles.quick}>
            <TextInput
              value={quickMin}
              onChangeText={setQuickMin}
              keyboardType="number-pad"
              style={styles.quickInput}
            />
            <Text style={{marginHorizontal:8, alignSelf:'center'}}>分</Text>
            <Pressable
              style={[styles.btn, styles.primary]}
              onPress={() => {
                const m = parseInt(quickMin || '0', 10);
                if (m <= 0) return;
                const tempSet = {
                  id: 'temp',
                  name: `クイック ${m}分`,
                  description: '単発タイマー',
                  sound: 'beep',
                  timers: [{ id: 'temp-1', label: `${m}分`, durationSec: m * 60 }],
                  createdAt: '', updatedAt: ''
                };
                setRunningSetId('temp');
              }}
            >
              <Text style={styles.btnText}>開始</Text>
            </Pressable>
          </View>

          <Text style={[styles.title, {marginTop:20}]}>タイマーセットを実行</Text>
          <FlatList
            data={state.timerSets}
            keyExtractor={i => i.id}
            renderItem={({item}) => (
              <Pressable onPress={()=>setRunningSetId(item.id)} style={styles.listItem}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemSub}>{item.timers.length} 個のタイマー</Text>
              </Pressable>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  quick: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  quickInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, width: 100 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  primary: { backgroundColor: Colors.primary },
  btnText: { fontWeight: '700', color: '#0B1D2A' },
  listItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemTitle: { color: Colors.text, fontWeight: '700' },
  itemSub: { color: Colors.subText, marginTop: 4, fontSize: 12 },
});
