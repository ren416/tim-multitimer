// import React, { useMemo, useState, useEffect } from 'react';
// import {
//   ScrollView,
//   View,
//   Text,
//   StyleSheet,
//   Pressable,
//   useWindowDimensions,
//   Modal,
//   Alert,
// } from 'react-native';
// import { Colors } from '../constants/colors';
// import { useTimerState } from '../context/TimerContext';
// import {
//   VictoryBar,
//   VictoryChart,
//   VictoryAxis,
//   VictoryPie,
//   VictoryLabel,
//   VictoryClipContainer,
// } from 'victory-native';
// import Svg, { Line } from 'react-native-svg';
// import { Ionicons } from '@expo/vector-icons';
// import { Picker } from '@react-native-picker/picker';
// import dayjs from 'dayjs';
// import weekOfYear from 'dayjs/plugin/weekOfYear';
// dayjs.extend(weekOfYear);
// 
// // 実行履歴をグラフや統計情報として表示する画面
// 
// type Range = '日' | '週';
// 
// // 徐々に白に近づけることで色を薄くするユーティリティ関数
// const lighten = (hex: string, factor: number) => {
//   const r = parseInt(hex.slice(1, 3), 16);
//   const g = parseInt(hex.slice(3, 5), 16);
//   const b = parseInt(hex.slice(5, 7), 16);
//   const nr = Math.round(r + (255 - r) * factor);
//   const ng = Math.round(g + (255 - g) * factor);
//   const nb = Math.round(b + (255 - b) * factor);
//   return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
// };
// 
// export default function HistoryScreen() {
//   const { state } = useTimerState();
//   const { width } = useWindowDimensions();
//   const now = dayjs();
//   const [range, setRange] = useState<Range>('週');
//   const [usageRange, setUsageRange] = useState<Range>('週');
//   const [year, setYear] = useState(now.year());
//   const [month, setMonth] = useState(now.month() + 1);
//   const [showPicker, setShowPicker] = useState(false);
// 
//   const visibleHistory = useMemo(
//     () =>
//       state.history.filter(
//         h =>
//           h.completedAt &&
//           !h.cancelled &&
//           (!h.timerSetId || !state.hiddenTimerSetIds.includes(h.timerSetId)),
//       ),
//     [state.history, state.hiddenTimerSetIds],
//   );
// 
//   const stats = useMemo(() => {
//     const entries = visibleHistory;
//     const totalSec = entries.reduce((s, h) => s + h.totalDurationSec, 0);
//     const sessions = entries.length;
//     const avgMin = sessions ? totalSec / sessions / 60 : 0;
//     const days = new Set(entries.map(h => dayjs(h.completedAt!).format('YYYY-MM-DD')));
//     let streak = 0;
//     let d = dayjs().startOf('day');
//     while (days.has(d.format('YYYY-MM-DD'))) {
//       streak++;
//       d = d.subtract(1, 'day');
//     }
//     return { totalSec, sessions, avgMin, streak };
//   }, [visibleHistory]);
// 
//   const chartInfo = useMemo(() => {
//     const history = visibleHistory;
//     const buckets: Record<string, number> = {};
//     history.forEach(h => {
//       const d = dayjs(h.completedAt!);
//       if (range === '日') {
//         if (d.year() === year && d.month() + 1 === month) {
//           const key = d.format('MM/DD');
//           buckets[key] = (buckets[key] ?? 0) + h.totalDurationSec;
//         }
//       } else {
//         const start = d.startOf('week');
//         if (start.year() === year && start.month() + 1 === month) {
//           const label = `${start.format('MM/DD')}~${start.add(6, 'day').format('MM/DD')}`;
//           buckets[label] = (buckets[label] ?? 0) + h.totalDurationSec;
//         }
//       }
//     });
//     const data = Object.entries(buckets)
//       .sort((a, b) => a[0].localeCompare(b[0]))
//       .map(([x, sec]) => ({ x, sec }));
//     return { data };
//   }, [visibleHistory, range, year, month]);
// 
//   const maxSec = chartInfo.data.reduce((m, d) => Math.max(m, d.sec), 0);
//   let unitDiv = 1;
//   let yMax = 60;
//   let yUnit = '秒';
//   if (maxSec < 60) {
//     yMax = 60;
//   } else if (maxSec < 3600) {
//     unitDiv = 60;
//     yMax = Math.floor(maxSec / 60) + 1;
//     yUnit = '分';
//   } else {
//     unitDiv = 3600;
//     yMax = Math.floor(maxSec / 3600) + 1;
//     yUnit = '時間';
//   }
//   const yLabel = `時間 (${yUnit})`;
//   const yTick = (t: number) => `${t}${yUnit}`;
//   const chartData = chartInfo.data.map(d => ({ x: d.x, y: d.sec / unitDiv }));
// 
//   const BAR_WIDTH = 10;
//   const BAR_GAP = BAR_WIDTH;
//   // Width reserved for the fixed Y axis on the left side of the chart
//   const AXIS_WIDTH = 60;
//   // Length of the x-axis line extending into the chart area
//   // Computed so that the line spans twice the distance from the chart's center
//   // to the vertical axis, effectively leaving the same margin as the Y axis on
//   // the right side of the frame
//   const X_AXIS_LINE_LENGTH = Math.max(0, width - 80 - AXIS_WIDTH * 2);
//   // Dimensions for the chart and axis layout
//   const CHART_HEIGHT = 260;
//   const CHART_PADDING_BOTTOM = 80;
//   // Padding on the right side so that the last bar isn't clipped
//   const chartPaddingRight = 20;
//   // Extra left padding so the first tick label isn't hidden under the Y axis
//   const FIRST_LABEL_PADDING = 50;
// 
//   const chartWidth =
//     chartData.length * (BAR_WIDTH + BAR_GAP) + chartPaddingRight + BAR_GAP;
// 
//   const usageInfo = useMemo(() => {
//     const entries = visibleHistory.filter(h => {
//       const d = dayjs(h.completedAt!);
//       if (usageRange === '日') {
//         return d.year() === year && d.month() + 1 === month;
//       } else {
//         const start = d.startOf('week');
//         return start.year() === year && start.month() + 1 === month;
//       }
//     });
//     const totals: Record<string, number> = {};
//     entries.forEach(h => {
//       const existing = state.timerSets.find(s => s.id === h.timerSetId)?.name;
//       const name = existing ?? (h.timerSetName ? `*${h.timerSetName}` : '*不明なタイマーセット');
//       totals[name] = (totals[name] ?? 0) + h.totalDurationSec;
//     });
//     const data = Object.entries(totals)
//       .map(([x, y]) => ({ x, y }))
//       .sort((a, b) => b.y - a.y);
//     const colors = data.map((_, i) => lighten('#00BFFF', i / (data.length + 1)));
//     return { data, colors };
//   }, [visibleHistory, state.timerSets, usageRange, year, month]);
// 
// 
//   useEffect(() => {
//     const milestones = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30];
//     const isMilestone =
//       milestones.includes(stats.streak) || (stats.streak > 30 && stats.streak % 10 === 0);
//     if (isMilestone) {
//       Alert.alert('おめでとうございます！', `${stats.streak}日継続しています！`);
//     }
//   }, [stats.streak]);
// 
//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
//       <Pressable onPress={() => setShowPicker(true)} style={styles.ymSelector}>
//         <Text style={styles.currentYM}>{`${year}年${month}月`}</Text>
//         <View style={styles.ymArrows}>
//           <Ionicons name="chevron-up-outline" size={12} color={Colors.text} />
//           <Ionicons name="chevron-down-outline" size={12} color={Colors.text} />
//         </View>
//       </Pressable>
// 
//       <View style={styles.summaryRow}>
//         <View style={styles.summaryBox}>
//           <Ionicons name="time-outline" size={24} color={Colors.primaryDark} />
//           <Text style={styles.summaryVal}>{(stats.totalSec / 3600).toFixed(1)}h</Text>
//           <Text style={styles.summaryLabel}>総時間</Text>
//         </View>
//         <View style={styles.summaryBox}>
//           <Ionicons name="play-circle-outline" size={24} color={Colors.primaryDark} />
//           <Text style={styles.summaryVal}>{stats.sessions}</Text>
//           <Text style={styles.summaryLabel}>セッション数</Text>
//         </View>
//         <View style={styles.summaryBox}>
//           <Ionicons name="timer-outline" size={24} color={Colors.primaryDark} />
//           <Text style={styles.summaryVal}>{stats.avgMin.toFixed(0)}分</Text>
//           <Text style={styles.summaryLabel}>平均時間</Text>
//         </View>
//         <View style={styles.summaryBox}>
//           <Ionicons name="flame-outline" size={24} color={Colors.primaryDark} />
//           <Text style={styles.summaryVal}>{stats.streak}</Text>
//           <Text style={styles.summaryLabel}>連続日数</Text>
//         </View>
//       </View>
// 
//       <View style={styles.card}>
//         <View style={styles.tabs}>
//           {(['日', '週'] as Range[]).map(r => (
//             <Pressable key={r} onPress={() => setRange(r)} style={[styles.tab, range === r && styles.tabActive]}>
//               <Text style={[styles.tabText, range === r && styles.tabTextActive]}>{r}</Text>
//             </Pressable>
//           ))}
//         </View>
//         <View style={{ padding: 12, position: 'relative' }}>
//           {chartData.length === 0 ? (
//             <Text style={{ color: Colors.subText }}>まだ記録がありません。</Text>
//           ) : (
//             <>
//               <View style={{ height: CHART_HEIGHT }}>
//                 <ScrollView
//                   horizontal
//                   showsHorizontalScrollIndicator
//                   contentContainerStyle={{ paddingLeft: AXIS_WIDTH + BAR_GAP + FIRST_LABEL_PADDING }}
//                   style={{ flex: 1 }}
//                   bounces={false}
//                   overScrollMode="never"
//                 >
//                   <VictoryChart
//                     width={chartWidth}
//                     height={CHART_HEIGHT}
//                     padding={{ top: 10, bottom: CHART_PADDING_BOTTOM, left: 0, right: chartPaddingRight }}
//                     domainPadding={{ x: [BAR_GAP / 2, BAR_GAP / 2], y: [0, 20] }}
//                     domain={{ y: [0, yMax] }}
//                     groupComponent={<VictoryClipContainer clipPadding={{ left: FIRST_LABEL_PADDING }} />}
//                   >
//                     <VictoryAxis
//                       style={{
//                         tickLabels: { angle: -45, fontSize: 10, padding: 25 },
//                       }}
//                     />
//                     <VictoryBar
//                       data={chartData}
//                       x="x"
//                       y="y"
//                       barWidth={BAR_WIDTH}
//                       style={{ data: { fill: Colors.primary } }}
//                     />
//                   </VictoryChart>
//                 </ScrollView>
//                 <Svg
//                   width={AXIS_WIDTH}
//                   height={CHART_HEIGHT}
//                   style={{ position: 'absolute', left: 0, top: 0, backgroundColor: Colors.card }}
//                   pointerEvents="none"
//                 >
//                   <VictoryAxis
//                     dependentAxis
//                     orientation="right"
//                     label={yLabel}
//                     tickFormat={yTick}
//                     domain={[0, yMax]}
//                     width={AXIS_WIDTH}
//                     height={CHART_HEIGHT}
//                     padding={{ top: 10, bottom: CHART_PADDING_BOTTOM, left: 40, right: 0 }}
//                     style={{
//                       axisLabel: { padding: 40 },
//                       tickLabels: { fontSize: 10, textAnchor: 'end', fill: Colors.text },
//                     }}
//                     tickLabelComponent={<VictoryLabel dx={-12} />}
//                     standalone={false}
//                   />
//                 </Svg>
//                 <Svg
//                   width={X_AXIS_LINE_LENGTH}
//                   height={CHART_HEIGHT}
//                   style={{ position: 'absolute', left: AXIS_WIDTH, top: 0 }}
//                   pointerEvents="none"
//                 >
//                   <Line
//                     x1={0}
//                     y1={CHART_HEIGHT - CHART_PADDING_BOTTOM}
//                     x2={X_AXIS_LINE_LENGTH}
//                     y2={CHART_HEIGHT - CHART_PADDING_BOTTOM}
//                     stroke={Colors.text}
//                     strokeWidth={1}
//                   />
//                 </Svg>
//               </View>
//             </>
//           )}
//         </View>
//       </View>
// 
//       <View style={styles.card}>
//         <Text style={styles.sectionTitle}>タイマータイプ別使用状況</Text>
//         <View style={[styles.tabs, { marginTop: 12 }]}>
//           {(['日', '週'] as Range[]).map(r => (
//             <Pressable
//               key={r}
//               onPress={() => setUsageRange(r)}
//               style={[styles.tab, usageRange === r && styles.tabActive]}
//             >
//               <Text style={[styles.tabText, usageRange === r && styles.tabTextActive]}>{r}</Text>
//             </Pressable>
//           ))}
//         </View>
//         {usageInfo.data.length === 0 ? (
//           <Text style={{ color: Colors.subText, marginTop: 8 }}>データがありません。</Text>
//         ) : (
//           <>
//             <VictoryPie
//               data={usageInfo.data}
//               x="x"
//               y="y"
//               width={width - 80}
//               height={width - 80}
//               colorScale={usageInfo.colors}
//               labels={() => null}
//             />
//             <View style={{ marginTop: 8 }}>
//               {usageInfo.data.map((u, idx) => (
//                 <Text key={u.x} style={styles.legendItem}>
//                   <Text style={{ color: usageInfo.colors[idx] }}>■</Text>:{u.x}
//                 </Text>
//               ))}
//             </View>
//           </>
//         )}
//       </View>
//       {usageInfo.data.some(d => d.x.startsWith('*')) && (
//         <Text style={styles.note}>*: このタイマーセットは現在削除されています。「設定」より確認できます。</Text>
//       )}
//       {showPicker && (
//         <Modal transparent animationType="slide" visible={showPicker} onRequestClose={() => setShowPicker(false)}>
//           <View style={styles.modalOverlay}>
//             <View style={styles.pickerBox}>
//               <View style={styles.pickerRow}>
//                 <Picker style={styles.picker} selectedValue={year} onValueChange={v => setYear(Number(v))}>
//                   {Array.from({ length: 21 }, (_, i) => now.year() - 10 + i).map(y => (
//                     <Picker.Item key={y} label={`${y}`} value={y} />
//                   ))}
//                 </Picker>
//                 <Picker style={styles.picker} selectedValue={month} onValueChange={v => setMonth(Number(v))}>
//                   {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
//                     <Picker.Item key={m} label={`${m}`} value={m} />
//                   ))}
//                 </Picker>
//               </View>
//               <Pressable onPress={() => setShowPicker(false)} style={styles.pickerDoneBtn}>
//                 <Text style={styles.pickerDoneText}>OK</Text>
//               </Pressable>
//             </View>
//           </View>
//         </Modal>
//       )}
//     </ScrollView>
//   );
// }
// 
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
//   ymSelector: {
//     flexDirection: 'row',
//     alignSelf: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: Colors.border,
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     marginBottom: 16,
//   },
//   currentYM: { fontWeight: '700', color: Colors.text, fontSize: 18 },
//   ymArrows: { marginLeft: 8, justifyContent: 'center' },
//   summaryRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
//   summaryBox: {
//     width: '48%',
//     backgroundColor: Colors.card,
//     borderRadius: 16,
//     padding: 12,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: Colors.border,
//     alignItems: 'center',
//   },
//   summaryVal: { fontWeight: '700', fontSize: 16, color: Colors.text, marginTop: 4 },
//   summaryLabel: { color: Colors.subText, fontSize: 12, marginTop: 2 },
//   card: {
//     backgroundColor: Colors.card,
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: Colors.border,
//     marginTop: 20,
//     padding: 12,
//   },
//   tabs: { flexDirection: 'row', gap: 8 },
//   tab: {
//     flex: 1,
//     paddingVertical: 8,
//     backgroundColor: Colors.card,
//     borderWidth: 1,
//     borderColor: Colors.border,
//     borderRadius: 10,
//     alignItems: 'center',
//   },
//   tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
//   tabText: { color: Colors.text, fontWeight: '700' },
//   tabTextActive: { color: '#0B1D2A' },
//   sectionTitle: { fontWeight: '700', color: Colors.text, fontSize: 16 },
//   legendItem: { marginTop: 4, color: Colors.text },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   pickerBox: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, width: '80%' },
//   pickerRow: { flexDirection: 'row', justifyContent: 'space-between' },
//   picker: { flex: 1 },
//   pickerDoneBtn: { marginTop: 16, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 8, backgroundColor: Colors.primary, borderRadius: 8 },
//   pickerDoneText: { fontWeight: '700', color: '#0B1D2A' },
//   note: { color: Colors.subText, fontSize: 12, marginTop: 8 },
// });
