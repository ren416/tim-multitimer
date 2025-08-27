// import React from 'react';
// import { ScrollView, View, Text, StyleSheet, Switch, Pressable } from 'react-native';
// import Slider from '@react-native-community/slider';
// import { Colors } from '../constants/colors';
// import { useTimerState } from '../context/TimerContext';
// import { Ionicons } from '@expo/vector-icons';
// 
// // 設定画面。通知関連の設定やデータ管理画面への遷移を提供する。
// 
// export default function SettingsScreen({ navigation }: any) {
//   const { state, dispatch } = useTimerState();
// 
//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.title}>アプリ設定</Text>
//       <View style={styles.section}>
//         <View style={styles.row}>
//           <Text style={styles.label}>通知を有効化</Text>
//           <Switch
//             value={state.settings.enableNotifications}
//             onValueChange={v => dispatch({ type: 'UPDATE_SETTINGS', payload: { enableNotifications: v } })}
//           />
//         </View>
//         <View style={{ marginTop: 12 }}>
//           <Text style={styles.label}>通知音量</Text>
//           <Slider
//             style={{ marginTop: 8 }}
//             value={state.settings.notificationVolume}
//             onValueChange={v =>
//               dispatch({ type: 'UPDATE_SETTINGS', payload: { notificationVolume: v } })
//             }
//             minimumValue={0}
//             maximumValue={1}
//             step={0.1}
//           />
//         </View>
//       </View>
//       <View style={styles.section}>
//         <Pressable style={styles.row} onPress={() => navigation.navigate('データ管理')}>
//           <Text style={styles.label}>データ管理</Text>
//           <Ionicons name="chevron-forward-outline" size={20} color={Colors.subText} />
//         </Pressable>
//       </View>
//     </ScrollView>
//   );
// }
// 
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
//   title: { fontSize: 18, fontWeight: '700', color: Colors.text },
//   section: { backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 12, marginTop: 16 },
//   row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
//   label: { color: Colors.text },
// });
