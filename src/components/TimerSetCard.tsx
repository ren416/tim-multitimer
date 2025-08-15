import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { TimerSet } from '../context/TimerContext';
import { Colors } from '../constants/colors';

type Props = {
  item: TimerSet;
  onRun?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
};

export default function TimerSetCard({ item, onRun, onEdit, onDuplicate, onDelete }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{item.name}</Text>
      {!!item.description && <Text style={styles.desc}>{item.description}</Text>}
      <Text style={styles.sub}>{item.timers.length} 個のタイマー</Text>
      <View style={styles.row}>
        <Pressable onPress={onRun} style={[styles.btn, styles.primary]}><Text style={styles.btxt}>実行</Text></Pressable>
        <Pressable onPress={onEdit} style={[styles.btn]}><Text style={styles.btxt}>編集</Text></Pressable>
        <Pressable onPress={onDuplicate} style={[styles.btn]}><Text style={styles.btxt}>複製</Text></Pressable>
        <Pressable onPress={onDelete} style={[styles.btn, styles.danger]}><Text style={[styles.btxt, {color:'#fff'}]}>削除</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  title: { fontWeight: '700', fontSize: 18, color: Colors.text },
  desc: { marginTop: 4, color: Colors.subText },
  sub: { marginTop: 4, color: Colors.subText, fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  btxt: { color: Colors.text, fontWeight: '700' },
  primary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  danger: { backgroundColor: Colors.danger, borderColor: Colors.danger },
});
