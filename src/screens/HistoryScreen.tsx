import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';
import * as FileSystem from 'expo-file-system';
import { VictoryBar, VictoryChart, VictoryAxis } from 'victory-native';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
dayjs.extend(weekOfYear);

type Range = '日'|'週'|'月'|'年';

export default function HistoryScreen() {
  const { state } = useTimerState();
  const [range, setRange] = useState<Range>('週');
  const [quote, setQuote] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const content = await FileSystem.readAsStringAsync(
          FileSystem.asset('assets/data/quotes.json')
        );
        const arr = JSON.parse(content);
        setQuote(arr[Math.floor(Math.random()*arr.length)]);
      } catch(e) {
        setQuote('継続は力なり。— 日本のことわざ');
      }
    })();
  }, []);

  const data = useMemo(() => {
    // Sum total minutes per bucket
    const now = dayjs();
    const history = state.history.filter(h => h.completedAt && !h.cancelled);
    const buckets: Record<string, number> = {};

    const add = (key: string, sec: number) => { buckets[key] = (buckets[key] ?? 0) + sec/60; };

    history.forEach(h => {
      const d = dayjs(h.completedAt!);
      let key = d.format('MM/DD');
      if (range === '週') key = `${d.week()}`; // simple week number
      if (range === '月') key = d.format('YYYY/MM');
      if (range === '年') key = d.format('YYYY');
      add(key, h.totalDurationSec);
    });

    return Object.entries(buckets).sort((a,b)=>a[0].localeCompare(b[0])).map(([x,y]) => ({ x, y }));
  }, [state.history, range]);

  return (
    <View style={styles.container}>
      <Text style={styles.quote}>{quote}</Text>
      <View style={styles.tabs}>
        {(['日','週','月','年'] as Range[]).map(r => (
          <Pressable key={r} onPress={()=>setRange(r)} style={[styles.tab, range===r && styles.tabActive]}>
            <Text style={[styles.tabText, range===r && styles.tabTextActive]}>{r}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{padding: 12}}>
        {data.length === 0 ? (
          <Text style={{color: Colors.subText}}>まだ記録がありません。</Text>
        ) : (
          <VictoryChart>
            <VictoryAxis />
            <VictoryBar data={data} x="x" y="y" />
          </VictoryChart>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  quote: { padding: 16, fontStyle: 'italic', color: Colors.subText },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
  tab: { flex: 1, paddingVertical: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.text, fontWeight: '700' },
  tabTextActive: { color: '#0B1D2A' },
});
