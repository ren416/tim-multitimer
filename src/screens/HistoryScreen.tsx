import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Colors } from '../constants/colors';
import { useTimerState } from '../context/TimerContext';
import quotes from '../../assets/data/quotes.json';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryPie } from 'victory-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
dayjs.extend(weekOfYear);

type Range = '日' | '週' | '月' | '年';

export default function HistoryScreen() {
  const { state } = useTimerState();
  const [range, setRange] = useState<Range>('週');
  const [quote, setQuote] = useState('');
  const { width } = useWindowDimensions();

  useEffect(() => {
    try {
      setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    } catch {
      setQuote('継続は力なり。');
    }
  }, []);

  const stats = useMemo(() => {
    const entries = state.history.filter(h => h.completedAt && !h.cancelled);
    const totalSec = entries.reduce((s, h) => s + h.totalDurationSec, 0);
    const sessions = entries.length;
    const avgMin = sessions ? totalSec / sessions / 60 : 0;
    const days = new Set(entries.map(h => dayjs(h.completedAt!).format('YYYY-MM-DD')));
    let streak = 0;
    let d = dayjs().startOf('day');
    while (days.has(d.format('YYYY-MM-DD'))) {
      streak++;
      d = d.subtract(1, 'day');
    }
    return { totalSec, sessions, avgMin, streak };
  }, [state.history]);

  const chartData = useMemo(() => {
    const history = state.history.filter(h => h.completedAt && !h.cancelled);
    const buckets: Record<string, number> = {};
    const add = (key: string, sec: number) => {
      // store time in hours for clearer scaling
      buckets[key] = (buckets[key] ?? 0) + sec / 3600;
    };
    history.forEach(h => {
      const d = dayjs(h.completedAt!);
      let key = d.format('MM/DD'); // 日: 日ごとの使用時間
      if (range === '週') key = `${d.year()}-W${d.week()}`; // 週: 年と週番号
      if (range === '月') key = d.format('YYYY/MM'); // 月: 年/月
      if (range === '年') key = d.format('YYYY');
      add(key, h.totalDurationSec);
    });
    return Object.entries(buckets).sort((a, b) => a[0].localeCompare(b[0])).map(([x, y]) => ({ x, y }));
  }, [state.history, range]);

  const usage = useMemo(() => {
    const entries = state.history.filter(h => h.completedAt && !h.cancelled);
    const totals: Record<string, number> = {};
    entries.forEach(h => {
      const name = state.timerSets.find(s => s.id === h.timerSetId)?.name ?? 'その他';
      totals[name] = (totals[name] ?? 0) + h.totalDurationSec;
    });
    return Object.entries(totals).map(([x, y]) => ({ x, y }));
  }, [state.history, state.timerSets]);
  const usageTotal = usage.reduce((s, d) => s + d.y, 0);
  const usageWithPercent = usage.map(u => ({ ...u, p: usageTotal ? Math.round((u.y / usageTotal) * 100) : 0 }));

  const badges = [
    { label: '初回達成', achieved: stats.sessions > 0 },
    { label: '7日連続', achieved: stats.streak >= 7 },
    { label: '30日連続', achieved: stats.streak >= 30 },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.quote}>{quote}</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Ionicons name="time-outline" size={24} color={Colors.primaryDark} />
          <Text style={styles.summaryVal}>{(stats.totalSec / 3600).toFixed(1)}h</Text>
          <Text style={styles.summaryLabel}>総時間</Text>
        </View>
        <View style={styles.summaryBox}>
          <Ionicons name="play-circle-outline" size={24} color={Colors.primaryDark} />
          <Text style={styles.summaryVal}>{stats.sessions}</Text>
          <Text style={styles.summaryLabel}>セッション数</Text>
        </View>
        <View style={styles.summaryBox}>
          <Ionicons name="timer-outline" size={24} color={Colors.primaryDark} />
          <Text style={styles.summaryVal}>{stats.avgMin.toFixed(0)}分</Text>
          <Text style={styles.summaryLabel}>平均時間</Text>
        </View>
        <View style={styles.summaryBox}>
          <Ionicons name="flame-outline" size={24} color={Colors.primaryDark} />
          <Text style={styles.summaryVal}>{stats.streak}</Text>
          <Text style={styles.summaryLabel}>連続日数</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.tabs}>
          {(['日', '週', '月', '年'] as Range[]).map(r => (
            <Pressable key={r} onPress={() => setRange(r)} style={[styles.tab, range === r && styles.tabActive]}>
              <Text style={[styles.tabText, range === r && styles.tabTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ padding: 12 }}>
          {chartData.length === 0 ? (
            <Text style={{ color: Colors.subText }}>まだ記録がありません。</Text>
          ) : (
            <VictoryChart
              width={width - 80}
              height={220}
              padding={{ top: 10, bottom: 50, left: 60, right: 20 }}
              domainPadding={{ x: 20, y: [0, 20] }}
            >
              <VictoryAxis
                style={{
                  tickLabels: { angle: -45, fontSize: 10, padding: 25 },
                }}
              />
              <VictoryAxis
                dependentAxis
                label="時間 (h)"
                tickFormat={(t) => `${t.toFixed(1)}h`}
                style={{
                  axisLabel: { padding: 40 },
                  tickLabels: { fontSize: 10 },
                }}
              />
              <VictoryBar
                data={chartData}
                x="x"
                y="y"
                barRatio={0.8}
                style={{ data: { fill: Colors.primary } }}
              />
            </VictoryChart>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>タイマータイプ別使用状況</Text>
        {usage.length === 0 ? (
          <Text style={{ color: Colors.subText, marginTop: 8 }}>データがありません。</Text>
        ) : (
          <>
            <VictoryPie data={usage} x="x" y="y" innerRadius={40} colorScale="qualitative" labelComponent={<></>} />
            <View style={{ marginTop: 8 }}>
              {usageWithPercent.map(u => (
                <Text key={u.x} style={styles.legendItem}>
                  {u.x} {u.p}%
                </Text>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>達成バッジ</Text>
        <View style={styles.badgesRow}>
          {badges.map(b => (
            <View key={b.label} style={[styles.badge, b.achieved && styles.badgeActive]}>
              <Ionicons name="ribbon" size={24} color={b.achieved ? '#fff' : Colors.subText} />
              <Text style={[styles.badgeText, b.achieved && { color: '#fff' }]}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  quote: { fontStyle: 'italic', color: Colors.subText, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  summaryBox: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  summaryVal: { fontWeight: '700', fontSize: 16, color: Colors.text, marginTop: 4 },
  summaryLabel: { color: Colors.subText, fontSize: 12, marginTop: 2 },
  card: { backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, marginTop: 20, padding: 12 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.text, fontWeight: '700' },
  tabTextActive: { color: '#0B1D2A' },
  sectionTitle: { fontWeight: '700', color: Colors.text, fontSize: 16 },
  legendItem: { marginTop: 4, color: Colors.text },
  badgesRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  badge: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  badgeText: { marginTop: 4, color: Colors.subText, fontSize: 12 },
});
