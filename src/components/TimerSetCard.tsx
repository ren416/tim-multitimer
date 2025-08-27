import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TimerSet } from '../context/TimerContext';
import { Colors } from '../constants/colors';
import IconButton from './IconButton';

// タイマーセットの情報をカード形式で表示するコンポーネント。
// 実行・編集・複製・削除などの操作ボタンを提供する。

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
      {/* 説明文があれば表示 */}
      {!!item.description && <Text style={styles.desc}>{item.description}</Text>}
      <Text style={styles.sub}>{item.timers.length} 個のタイマー</Text>
      <View style={styles.row}>
        {/* 各種操作ボタン */}
        <IconButton label="実行" icon="play" onPress={onRun} style={{ flex: 1 }} />
        <IconButton label="編集" icon="create-outline" onPress={onEdit} type="secondary" style={{ flex: 1 }} />
        <IconButton label="複製" icon="copy-outline" onPress={onDuplicate} type="secondary" style={{ flex: 1 }} />
        <IconButton label="削除" icon="trash-outline" onPress={onDelete} type="danger" style={{ flex: 1 }} />
      </View>
    </View>
  );
}

// スタイル定義
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 1,
  },
  title: { fontWeight: '700', fontSize: 18, color: Colors.text },
  desc: { marginTop: 4, color: Colors.subText },
  sub: { marginTop: 4, color: Colors.subText, fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
});
