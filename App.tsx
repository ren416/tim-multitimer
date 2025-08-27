import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import RootTabs from './src/navigation';
import { TimerProvider } from './src/context/TimerContext';
import { Colors } from './src/constants/colors';
import { StatusBar } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';

// アプリ全体のエントリーポイントとなるファイル。
// ここではタイマー機能を提供するコンテキストで全体をラップし、
// 画面遷移を提供するナビゲーションコンテナを初期化する。

// React Navigation のテーマ設定。
// デフォルトテーマを基に、アプリ独自の配色を上書きしている。
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background, // 画面全体の背景色
    card: Colors.card,             // ヘッダーやタブなどの色
    border: Colors.border,         // 境界線の色
    text: Colors.text,             // 文字色
    primary: Colors.primary,       // メインのアクセントカラー
  }
};

// 端末がスリープしないようにするためのラッパーコンポーネント。
// 子要素を表示しつつ、`useKeepAwake` フックでスリープを防止する。
function WithKeepAwake({ children }: { children: React.ReactNode }) {
  useKeepAwake();
  return <>{children}</>;
}

// アプリケーションのルートコンポーネント。
// タイマーコンテキスト・スリープ防止・ナビゲーションを順にネストしている。
export default function App() {
  return (
    <TimerProvider>
      <WithKeepAwake>
        <NavigationContainer theme={theme}>
          {/* ステータスバーのスタイルを設定 */}
          <StatusBar barStyle="dark-content" />
          {/* タブナビゲーションを表示 */}
          <RootTabs />
        </NavigationContainer>
      </WithKeepAwake>
    </TimerProvider>
  );
}
