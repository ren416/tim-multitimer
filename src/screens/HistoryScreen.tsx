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

// 徐々に白に近づけることで色を薄くする
const lighten = (hex: string, factor: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (255 - r) * factor);
  const ng = Math.round(g + (255 - g) * factor);
  const nb = Math.round(b + (255 - b) * factor);
  return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
};

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

  const chartInfo = useMemo(() => {
    const history = state.history.filter(h => h.completedAt && !h.cancelled);
    const buckets: Record<string, number> = {};
    let year = '';
    const add = (key: string, sec: number) => {
      buckets[key] = (buckets[key] ?? 0) + sec;
    };
    history.forEach(h => {
      const d = dayjs(h.completedAt!);
      if (range === '日') {
        add(d.format('MM/DD'), h.totalDurationSec);
        if (!year) year = d.format('YYYY');
      } else if (range === '週') {
        const start = d.startOf('week');
        const label = `${start.format('MM/DD')}~${start.add(7, 'day').format('MM/DD')}`;
        add(label, h.totalDurationSec);
        if (!year) year = start.format('YYYY');
      } else if (range === '月') {
        add(d.format('MM'), h.totalDurationSec);
        if (!year) year = d.format('YYYY');
      } else {
        add(d.format('YYYY'), h.totalDurationSec);
      }
    });
    const data = Object.entries(buckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([x, sec]) => ({ x, sec }));
    return { data, year };
  }, [state.history, range]);

  const maxSec = chartInfo.data.reduce((m, d) => Math.max(m, d.sec), 0);
  let unitDiv = 1;
  let yMax = 60;
  let yLabel = '時間 (s)';
  let yTick = (t: number) => `${t}s`;
  if (maxSec < 60) {
    yMax = 60;
  } else if (maxSec < 3600) {
    unitDiv = 60;
    yMax = Math.floor(maxSec / 60) + 1;
    yLabel = '時間 (m)';
    yTick = (t: number) => `${t}m`;
  } else {
    unitDiv = 3600;
    yMax = Math.floor(maxSec / 3600) + 1;
    yLabel = '時間 (h)';
    yTick = (t: number) => `${t}h`;
  }
  const chartData = chartInfo.data.map(d => ({ x: d.x, y: d.sec / unitDiv }));

  const usageInfo = useMemo(() => {
    const entries = state.history.filter(h => h.completedAt && !h.cancelled);
    const totals: Record<string, number> = {};
    entries.forEach(h => {
      const name = state.timerSets.find(s => s.id === h.timerSetId)?.name ?? 'その他';
      totals[name] = (totals[name] ?? 0) + h.totalDurationSec;
    });
    const data = Object.entries(totals)
      .map(([x, y]) => ({ x, y }))
      .sort((a, b) => b.y - a.y);
    const colors = data.map((_, i) => lighten('#00BFFF', i / (data.length + 1)));
    return { data, colors };
  }, [state.history, state.timerSets]);

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
        <View style={{ padding: 12, position: 'relative' }}>
          {chartData.length === 0 ? (
            <Text style={{ color: Colors.subText }}>まだ記録がありません。</Text>
          ) : (
            <>
              {chartInfo.year ? <Text style={styles.chartYear}>{chartInfo.year}</Text> : null}
              <VictoryChart
                width={width - 80}
                height={220}
                padding={{ top: 10, bottom: 50, left: 60, right: 20 }}
                domainPadding={{ x: range === '日' ? [5, 5] : [20, 20], y: [0, 20] }}
                domain={{ y: [0, yMax] }}
              >
                <VictoryAxis
                  style={{
                    tickLabels: { angle: -45, fontSize: 10, padding: 25 },
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  label={yLabel}
                  tickFormat={yTick}
                  style={{
                    axisLabel: { padding: 40 },
                    tickLabels: { fontSize: 10 },
                  }}
                />
                <VictoryBar
                  data={chartData}
                  x="x"
                  y="y"
                  barRatio={range === '日' ? 0.4 : 0.8}
                  style={{ data: { fill: Colors.primary } }}
                />
              </VictoryChart>
            </>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>タイマータイプ別使用状況</Text>
        {usageInfo.data.length === 0 ? (
          <Text style={{ color: Colors.subText, marginTop: 8 }}>データがありません。</Text>
        ) : (
          <>
            <VictoryPie
              data={usageInfo.data}
              x="x"
              y="y"
              width={width - 80}
              height={width - 80}
              innerRadius={(width - 80) / 3}
              colorScale={usageInfo.colors}
              labels={() => null}
            />
            <View style={{ marginTop: 8 }}>
              {usageInfo.data.map((u, idx) => (
                <Text key={u.x} style={styles.legendItem}>
                  <Text style={{ color: usageInfo.colors[idx] }}>■</Text>:{u.x}
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
  chartYear: { position: 'absolute', top: 0, left: 0, color: Colors.subText, fontWeight: '700' },
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
