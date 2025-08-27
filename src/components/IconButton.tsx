import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

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
  const background = {
    primary: Colors.primary,
    secondary: Colors.card,
    danger: Colors.danger,
  }[type];
  const textColor = type === 'secondary' ? Colors.text : '#fff';
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: background, opacity: pressed ? 0.8 : 1 },
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
      <Ionicons name={icon} size={20} color={textColor} style={{ marginRight: 6 }} />
      <Text style={[styles.txt, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

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
  txt: { fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
