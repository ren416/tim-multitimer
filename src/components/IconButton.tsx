import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// アイコンとラベルを組み合わせたボタンコンポーネント。
// 汎用的に利用できるよう、種別やスタイルを指定できる。

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  type?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export default function IconButton({
  label,
  icon,
  onPress,
  style,
  type = 'primary',
  disabled,
}: Props) {
  // ボタンの種類に応じて背景色を切り替える
  const background = {
    primary: Colors.primary,
    secondary: Colors.card,
    danger: Colors.danger,
  }[type];
  // secondary タイプのみ文字色を通常のテキスト色にする
  const textColor = type === 'secondary' ? Colors.text : '#fff';
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: background, opacity: pressed ? 0.8 : 1 }, // 押下時に透明度を変更
        type === 'secondary' && {
          borderWidth: 1,
          borderColor: Colors.border,
          paddingHorizontal: 13,
          paddingVertical: 9,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      {/* Ionicons のアイコンを表示 */}
      <Ionicons name={icon} size={20} color={textColor} style={{ marginRight: 6 }} />
      {/* ボタンのラベル */}
      <Text style={[styles.txt, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// コンポーネントで使用するスタイル定義
const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  txt: { fontWeight: '700' }, // ボタンラベルを太字にする
  disabled: { opacity: 0.5 }, // 無効化時は半透明
});
