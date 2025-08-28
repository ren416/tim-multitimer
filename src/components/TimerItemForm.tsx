import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Colors } from '../constants/colors';

// タイマーの個別設定を入力するフォームコンポーネント。
// ラベル・時間・メモを入力し、親コンポーネントへ変更を通知する。

type Props = {
  value?: { label: string; durationSec: number; note?: string };
  onChange: (v: {label: string; durationSec: number; note?: string}) => void;
  onRemove?: () => void;
};

export default function TimerItemForm({ value, onChange, onRemove }: Props) {
  // ラベル・時間・メモを内部状態として管理
  const [label, setLabel] = useState(value?.label ?? '');
  const [minutes, setMinutes] = useState(value ? Math.floor(value.durationSec / 60).toString() : '');
  const [seconds, setSeconds] = useState(value ? String(value.durationSec % 60) : '0');
  const [note, setNote] = useState(value?.note ?? '');

  /**
   * 入力欄の内容をまとめて親コンポーネントへ通知する。
   * 入力された分・秒から合計秒数を計算し、負値は0として扱う。
   */
  const commit = (): void => {
    const m = parseInt(minutes || '0', 10);
    const s = parseInt(seconds || '0', 10);
    onChange({ label, durationSec: Math.max(0, m * 60 + s), note });
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        placeholder="ラベル（例：集中）"
        value={label}
        onChangeText={(t)=>{ setLabel(t); commit(); }}
        style={styles.input}
      />
      <View style={styles.row}>
        {/* 分数の入力欄 */}
        <TextInput
          placeholder="分"
          keyboardType="number-pad"
          value={minutes}
          onChangeText={(t)=>{ setMinutes(t); commit(); }}
          style={[styles.input, styles.small]}
        />
        <Text style={{marginHorizontal:8, alignSelf:'center'}}>分</Text>
        {/* 秒数の入力欄 */}
        <TextInput
          placeholder="秒"
          keyboardType="number-pad"
          value={seconds}
          onChangeText={(t)=>{ setSeconds(t); commit(); }}
          style={[styles.input, styles.small]}
        />
        <Text style={{marginLeft:8, alignSelf:'center'}}>秒</Text>
      </View>
      {/* 任意入力のメモ欄 */}
      <TextInput
        placeholder="メモ（任意）"
        value={note}
        onChangeText={(t)=>{ setNote(t); commit(); }}
        style={styles.input}
      />
      {/* 削除ボタン（親からハンドラが渡された場合のみ表示） */}
      {!!onRemove && (
        <Pressable onPress={onRemove} style={styles.remove}>
          <Text style={{color:'#fff'}}>削除</Text>
        </Pressable>
      )}
    </View>
  );
}

// フォーム全体で使用するスタイル定義
const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: Colors.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    flexGrow: 1,
  },
  small: { width: 70 },
  remove: {
    marginTop: 8,
    backgroundColor: Colors.danger,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
});
