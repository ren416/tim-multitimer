import React from 'react'; // React本体をインポート
import { Pressable, Text, StyleSheet, ViewStyle, View } from 'react-native'; // ボタンやテキストなどのUI要素
import { Ionicons } from '@expo/vector-icons'; // アイコンフォントを提供するライブラリ
import { Colors } from '../constants/colors'; // 共通で利用するカラー定数

// アイコンとラベルを組み合わせたボタンコンポーネント。
// 汎用的に利用できるよう、種別やスタイルを指定できる。

/**
 * IconButton で利用可能なプロパティ。
 * アイコン名やラベル、押下時のコールバックなどを外部から細かく制御できる。
 */
type Props = {
  label: string; // ボタンに表示するテキストラベル
  icon: keyof typeof Ionicons.glyphMap; // 表示するIoniconsのアイコン名
  onPress?: () => void; // ボタンが押された際に呼ばれるコールバック
  style?: ViewStyle | ViewStyle[]; // 外部から追加指定するスタイル
  type?: 'primary' | 'secondary' | 'danger'; // ボタンの表示タイプ
  disabled?: boolean; // ボタンが操作不可かどうか
};

export default function IconButton({
  label, // ボタンに表示するラベル文字列
  icon, // 表示するアイコン名
  onPress, // 押下時に呼び出される関数
  style, // 外部から追加指定されるスタイル
  type = 'primary', // デフォルト種別はprimary
  disabled, // 押下不可かどうか
}: Props) { // アイコンとラベルを組み合わせた汎用ボタン
  const background = { // ボタンの種類ごとの背景色を定義
    primary: Colors.primary, // 主要操作用の色
    secondary: Colors.card, // 補助操作用の色
    danger: Colors.danger, // 注意を促す赤系の色
  }[type]; // 現在のtypeに対応する色を取得
  const textColor = type === 'secondary' ? Colors.text : '#fff'; // secondaryのみテキスト色を通常色に
  return (
    <Pressable
      disabled={disabled} // 非活性時は押せないようにする
      onPress={onPress} // 押下時に呼び出す処理
      style={({ pressed }) => [ // 押下状態に応じたスタイルを指定
        styles.btn, // 基本スタイル
        { backgroundColor: background, opacity: pressed ? 0.8 : 1 }, // 背景色と押下時の透明度
        type === 'secondary' && { // secondaryタイプ専用の装飾
          borderWidth: 1, // 枠線の太さ
          borderColor: Colors.border, // 枠線の色
          paddingHorizontal: 13, // 左右の余白
          paddingVertical: 9, // 上下の余白
        },
        disabled && styles.disabled, // 無効化時のスタイル
        style, // 外部から渡された追加スタイル
      ]}
    >
      <View style={styles.content}>
        {/* 指定された名前のアイコンを描画し、テキストとの間隔を確保 */}
        <Ionicons
          name={icon}
          size={20}
          color={textColor}
          style={{ marginRight: 6 }}
        />
        <Text style={[styles.txt, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({ // コンポーネントで使用するスタイル定義
  btn: { // ボタン全体のスタイル
    paddingHorizontal: 14, // 左右の余白
    paddingVertical: 10, // 上下の余白
    borderRadius: 12, // 角の丸み
    shadowColor: '#000', // 影の色
    shadowOpacity: 0.1, // 影の透明度
    shadowOffset: { width: 0, height: 2 }, // 影の位置
    shadowRadius: 4, // 影のぼかし半径
    elevation: 2, // Androidでの影の高さ
  },
  content: { // アイコンとテキストを横並びに配置
    flexDirection: 'row',
    alignItems: 'center',
  },
  txt: { fontWeight: '700' }, // ボタンラベルを太字にする
  disabled: { opacity: 0.5 }, // 無効化時は半透明にする
});
