import 'react-native-gesture-handler'; // React Navigationで必要なジェスチャーハンドラーを初期化
import 'react-native-reanimated'; // アニメーションを有効化するライブラリの読み込み
import React, { PropsWithChildren } from 'react'; // React本体と子要素型をインポート
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'; // ナビゲーションコンテナとデフォルトテーマ
import RootTabs from './src/navigation'; // ルートとなるタブナビゲーション
import { TimerProvider } from './src/context/TimerContext'; // タイマー機能を提供するコンテキスト
import { Colors } from './src/constants/colors'; // カラー定数を取得
import { StatusBar } from 'react-native'; // ステータスバー制御用コンポーネント
import { useKeepAwake } from 'expo-keep-awake'; // 端末のスリープを防止するフック

// React Navigation のテーマ設定。
// デフォルトテーマを基に、アプリ独自の配色を上書きしている。
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.card,
    border: Colors.border,
    text: Colors.text,
    primary: Colors.primary,
  },
};

// 端末がスリープしないようにするためのラッパーコンポーネント。
// 子要素を表示しつつ、`useKeepAwake` フックでスリープを防止する。
function WithKeepAwake({ children }: PropsWithChildren<{}>) { // スリープ防止用のラッパー
  useKeepAwake(); // コンポーネントが表示されている間は画面を暗くしない
  return <>{children}</>; // 子要素をそのまま表示
}

// アプリケーションのルートコンポーネント。
// タイマーコンテキスト・スリープ防止・ナビゲーションを順にネストしている。
export default function App() { // アプリケーションのルートコンポーネント
  return ( // JSXを返す
    <TimerProvider>
      {/* タイマー情報を提供するコンテキストで全体を包む */}
      <WithKeepAwake>
        {/* 端末がスリープしないようにするラッパー */}
        <NavigationContainer theme={theme}>
          {/* ナビゲーションを初期化しテーマを適用 */}
          <StatusBar barStyle="dark-content" />
          <RootTabs />
        </NavigationContainer>
      </WithKeepAwake>
    </TimerProvider>
  ); // return終端
}

